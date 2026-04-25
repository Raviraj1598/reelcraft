import { ApiError, apiFetch } from '../../lib/apiClient';

export interface Project {
  id: string;
  userId: string;
  title: string;
  script: string;
  voiceId: string;
  voiceName: string;
  template: string;
  mood: string;
  format: '9:16' | '1:1' | '16:9';
  duration: number;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    wordCount?: number;
    credits?: number;
    views?: number;
    downloads?: number;
    sceneCount?: number;
    scriptProvider?: string;
    audioProvider?: string;
    visualProvider?: string;
    qualityTier?: string;
    lastError?: string;
    subtitles?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
    scenes?: Array<{
      title: string;
      caption: string;
      prompt: string;
      duration: number;
      imageUrl?: string;
    }>;
  };
}

export interface ProjectStats {
  total: number;
  completed: number;
  processing: number;
  totalViews: number;
  totalDownloads: number;
}

export interface CreateProjectRequest {
  title: string;
  script: string;
  voiceId: string;
  voiceName: string;
  template: string;
  mood: string;
  format?: '9:16' | '1:1' | '16:9';
  duration?: number;
}

export interface UpdateProjectRequest {
  title?: string;
  script?: string;
  status?: Project['status'];
  videoUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  jobId?: string;
}

class ProjectsService {
  getUserProjects(_userId?: string): Promise<Project[]> {
    return apiFetch<Project[]>('/api/projects');
  }

  async getProject(projectId: string): Promise<Project | null> {
    try {
      return await apiFetch<Project>(`/api/projects/${projectId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    await apiFetch<{ ok: boolean }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    return true;
  }

  createProject(_userId: string, data: CreateProjectRequest): Promise<Project> {
    return apiFetch<Project>('/api/projects', {
      method: 'POST',
      body: data,
    });
  }

  updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project> {
    return apiFetch<Project>(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  getProjectStats(_userId?: string): Promise<ProjectStats> {
    return apiFetch<ProjectStats>('/api/projects/stats');
  }

  incrementViews(projectId: string): Promise<void> {
    return apiFetch(`/api/projects/${projectId}/view`, {
      method: 'POST',
    });
  }

  incrementDownloads(projectId: string): Promise<void> {
    return apiFetch(`/api/projects/${projectId}/download`, {
      method: 'POST',
    });
  }
}

export const projectsService = new ProjectsService();
