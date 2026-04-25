import { apiFetch } from '../../lib/apiClient';

export interface Voice {
  id: string;
  name: string;
  category: string;
  description: string;
  previewUrl?: string;
  gender: 'male' | 'female';
  age: 'young' | 'middle-aged' | 'old';
  accent: string;
}

export interface VoiceGenerationRequest {
  text: string;
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
}

export interface VoiceGenerationResponse {
  audioUrl: string;
  duration: number;
  voiceId: string;
  format: string;
}

class ElevenLabsService {
  async getVoices(): Promise<Voice[]> {
    return apiFetch<Voice[]>('/api/voices');
  }

  async getVoice(voiceId: string): Promise<Voice | null> {
    const voices = await this.getVoices();
    return voices.find((voice) => voice.id === voiceId) || null;
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    return {
      audioUrl: '',
      duration: Math.max(8, Math.ceil((request.text.split(/\s+/).filter(Boolean).length / 150) * 60)),
      voiceId: request.voiceId,
      format: 'server-managed',
    };
  }
}

export const elevenlabsService = new ElevenLabsService();
