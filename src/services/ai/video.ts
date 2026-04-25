import { apiFetch } from '../../lib/apiClient';
import type { Project } from '../api/projects';

export interface VideoGenerationRequest {
  script: string;
  title?: string;
  voiceId: string;
  template: string;
  mood: string;
  duration: number;
  format: '9:16' | '1:1' | '16:9';
}

export interface VideoGenerationProgress {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  projectId?: string;
}

export interface VideoGenerationResponse {
  jobId: string;
  status: string;
  projectId: string;
}

interface JobStatusResponse {
  job: {
    id: string;
    status: VideoGenerationProgress['status'];
    progress: number;
    currentStep: string;
    error?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  };
  project: Project | null;
}

class VideoGenerationService {
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    return apiFetch<VideoGenerationResponse>('/api/jobs/video', {
      method: 'POST',
      body: request,
    });
  }

  async checkProgress(jobId: string): Promise<VideoGenerationProgress> {
    const response = await apiFetch<JobStatusResponse>(`/api/jobs/${jobId}`);

    return {
      status: response.job.status,
      progress: response.job.progress,
      currentStep: response.job.currentStep,
      error: response.job.error,
      videoUrl: response.project?.videoUrl || response.job.videoUrl,
      thumbnailUrl: response.project?.thumbnailUrl || response.job.thumbnailUrl,
      projectId: response.project?.id,
    };
  }
}

export const videoGenerationService = new VideoGenerationService();
