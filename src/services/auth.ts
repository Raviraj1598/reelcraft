import { apiFetch } from '../lib/apiClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface NotificationSettings {
  videoComplete: boolean;
  credits: boolean;
  newFeatures: boolean;
  marketing: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  credits: import('./api/credits').UserCredits;
  settings: NotificationSettings;
}

export interface SessionPayload {
  user: AuthUser;
  credits: import('./api/credits').UserCredits;
  settings: NotificationSettings;
}

class AuthService {
  register(name: string, email: string, password: string) {
    return apiFetch<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
  }

  login(email: string, password: string) {
    return apiFetch<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  getSession() {
    return apiFetch<SessionPayload>('/api/auth/me');
  }

  getSettings() {
    return apiFetch<{ profile: AuthUser; notifications: NotificationSettings }>('/api/settings');
  }

  updateSettings(notifications: NotificationSettings) {
    return apiFetch<{ profile: AuthUser; notifications: NotificationSettings }>('/api/settings', {
      method: 'PATCH',
      body: { notifications },
    });
  }
}

export const authService = new AuthService();
