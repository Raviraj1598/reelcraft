import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearAccessToken, saveAccessToken } from '../lib/appState';
import { UserCredits } from '../services/api/credits';
import { authService, AuthUser, NotificationSettings } from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  credits: UserCredits | null;
  settings: NotificationSettings | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updateSettings: (notifications: NotificationSettings) => Promise<void>;
  setCredits: React.Dispatch<React.SetStateAction<UserCredits | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const session = await authService.getSession();
      setUser(session.user);
      setCredits(session.credits);
      setSettings(session.settings);
    } catch (_error) {
      clearAccessToken();
      setUser(null);
      setCredits(null);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const login = async (email: string, password: string) => {
    const session = await authService.login(email, password);
    saveAccessToken(session.token);
    setUser(session.user);
    setCredits(session.credits);
    setSettings(session.settings);
  };

  const register = async (name: string, email: string, password: string) => {
    const session = await authService.register(name, email, password);
    saveAccessToken(session.token);
    setUser(session.user);
    setCredits(session.credits);
    setSettings(session.settings);
  };

  const logout = () => {
    clearAccessToken();
    setUser(null);
    setCredits(null);
    setSettings(null);
  };

  const updateSettings = async (notifications: NotificationSettings) => {
    const response = await authService.updateSettings(notifications);
    setSettings(response.notifications);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      credits,
      settings,
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      updateSettings,
      setCredits,
    }),
    [credits, isLoading, settings, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
