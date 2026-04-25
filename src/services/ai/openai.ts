import { apiFetch } from '../../lib/apiClient';

export interface ScriptGenerationRequest {
  prompt: string;
  mood?: string;
  duration?: number;
  template?: string;
  style?: string;
}

export interface ScriptGenerationResponse {
  script: string;
  wordCount: number;
  estimatedDuration: number;
  suggestions?: string[];
}

class OpenAIService {
  generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
    return apiFetch<ScriptGenerationResponse>('/api/scripts/generate', {
      method: 'POST',
      body: request,
    });
  }

  improveScript(script: string, feedback: string): Promise<ScriptGenerationResponse> {
    return apiFetch<ScriptGenerationResponse>('/api/scripts/improve', {
      method: 'POST',
      body: { script, feedback },
    });
  }
}

export const openaiService = new OpenAIService();
