import { apiFetch } from '../lib/apiClient';
import { projectsService } from './api/projects';

export interface VideoWorkflowRequest {
  userId?: string;
  title: string;
  script?: string;
  scriptPrompt?: string;
  voiceId: string;
  template: string;
  mood: string;
  format?: '9:16' | '1:1' | '16:9';
  duration?: number;
}

export interface VideoWorkflowProgress {
  step: 'queued' | 'scenes' | 'voice' | 'render' | 'subtitles' | 'complete';
  progress: number;
  message: string;
  projectId?: string;
  error?: string;
}

export type ProgressCallback = (progress: VideoWorkflowProgress) => void;

interface JobStatusResponse {
  job: {
    id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    currentStep: string;
    error?: string;
  };
  project: {
    id: string;
    status: 'draft' | 'processing' | 'completed' | 'failed';
  } | null;
}

class VideoWorkflowService {
  async generateVideo(
    request: VideoWorkflowRequest,
    onProgress?: ProgressCallback
  ): Promise<string> {
    if (!request.script && !request.scriptPrompt) {
      throw new Error('No script provided or generated');
    }

    const queuedJob = await apiFetch<{ jobId: string; projectId: string; status: string }>('/api/jobs/video', {
      method: 'POST',
      body: {
        title: request.title,
        script: request.script || request.scriptPrompt,
        voiceId: request.voiceId,
        template: request.template,
        mood: request.mood,
        format: request.format || '9:16',
        duration: request.duration || 15,
      },
    });

    onProgress?.({
      step: 'queued',
      progress: 5,
      message: 'Job queued...',
      projectId: queuedJob.projectId,
    });

    return this.pollJob(queuedJob.jobId, queuedJob.projectId, onProgress);
  }

  async getWorkflowStatus(projectId: string): Promise<VideoWorkflowProgress | null> {
    const project = await projectsService.getProject(projectId);

    if (!project) {
      return null;
    }

    if (project.status === 'completed') {
      return {
        step: 'complete',
        progress: 100,
        message: 'Complete',
        projectId,
      };
    }

    if (project.status === 'failed') {
      return {
        step: 'render',
        progress: 0,
        message: 'Failed',
        projectId,
        error: 'Video generation failed.',
      };
    }

    return {
      step: 'render',
      progress: 50,
      message: 'Processing...',
      projectId,
    };
  }

  private async pollJob(
    jobId: string,
    projectId: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    for (;;) {
      const status = await apiFetch<JobStatusResponse>(`/api/jobs/${jobId}`);
      const mapped = this.mapJobToWorkflow(status, projectId);

      onProgress?.(mapped);

      if (status.job.status === 'completed') {
        return projectId;
      }

      if (status.job.status === 'failed') {
        throw new Error(status.job.error || 'Video generation failed.');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  private mapJobToWorkflow(status: JobStatusResponse, projectId: string): VideoWorkflowProgress {
    if (status.job.status === 'completed') {
      return {
        step: 'complete',
        progress: 100,
        message: status.job.currentStep,
        projectId,
      };
    }

    if (status.job.progress < 20) {
      return {
        step: 'queued',
        progress: status.job.progress,
        message: status.job.currentStep,
        projectId,
      };
    }

    if (status.job.currentStep.toLowerCase().includes('scene')) {
      return {
        step: 'scenes',
        progress: status.job.progress,
        message: status.job.currentStep,
        projectId,
      };
    }

    if (status.job.currentStep.toLowerCase().includes('voice')) {
      return {
        step: 'voice',
        progress: status.job.progress,
        message: status.job.currentStep,
        projectId,
      };
    }

    if (status.job.currentStep.toLowerCase().includes('subtitle')) {
      return {
        step: 'subtitles',
        progress: status.job.progress,
        message: status.job.currentStep,
        projectId,
        error: status.job.error,
      };
    }

    return {
      step: 'render',
      progress: status.job.progress,
      message: status.job.currentStep,
      projectId,
      error: status.job.error,
    };
  }
}

export const videoWorkflowService = new VideoWorkflowService();
