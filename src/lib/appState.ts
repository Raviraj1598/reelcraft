const generationDraftKey = 'videoai_generation_draft';
const accessTokenKey = 'videoai_access_token';

export interface VideoCreationDraft {
  template: string;
  script: string;
  voice: string;
  mood: string;
  prompt?: string;
}

export function getGenerationDraft(): VideoCreationDraft | null {
  try {
    const storedDraft = localStorage.getItem(generationDraftKey);
    if (!storedDraft) {
      return null;
    }

    return JSON.parse(storedDraft) as VideoCreationDraft;
  } catch (error) {
    console.error('Error loading generation draft:', error);
    return null;
  }
}

export function saveGenerationDraft(draft: Partial<VideoCreationDraft>): void {
  try {
    const currentDraft = getGenerationDraft() || {};
    const nextDraft = { ...currentDraft, ...draft };
    localStorage.setItem(generationDraftKey, JSON.stringify(nextDraft));
  } catch (error) {
    console.error('Error saving generation draft:', error);
  }
}

export function clearGenerationDraft(): void {
  try {
    localStorage.removeItem(generationDraftKey);
  } catch (error) {
    console.error('Error clearing generation draft:', error);
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(accessTokenKey);
  } catch (error) {
    console.error('Error loading access token:', error);
    return null;
  }
}

export function saveAccessToken(token: string): void {
  try {
    localStorage.setItem(accessTokenKey, token);
  } catch (error) {
    console.error('Error saving access token:', error);
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(accessTokenKey);
  } catch (error) {
    console.error('Error clearing access token:', error);
  }
}
