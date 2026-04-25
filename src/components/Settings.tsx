import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, Bell, Lock, Palette, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSettings } from '../services/auth';

function getInitials(name?: string) {
  if (!name) {
    return 'AI';
  }

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Settings() {
  const navigate = useNavigate();
  const { user, settings, updateSettings, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationSettings>({
    videoComplete: true,
    credits: true,
    newFeatures: false,
    marketing: false,
  });

  useEffect(() => {
    if (settings) {
      setNotifications(settings);
    }
  }, [settings]);

  const updateNotificationValue = async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);

    try {
      await updateSettings(next);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <span className="text-2xl text-white">{getInitials(user?.name)}</span>
            </div>
            <div>
              <h2 className="text-lg text-gray-900">{user?.name || 'Your profile'}</h2>
              <p className="text-sm text-gray-500">{user?.email || 'No email connected'}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full h-10 rounded-lg" disabled>
            Profile editing coming next
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base text-gray-900">Account</h3>
          </div>

          {[
            { icon: User, label: 'Personal Information' },
            { icon: Lock, label: 'Password & Security' },
            { icon: Palette, label: 'Appearance' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b last:border-b-0 border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-900">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base text-gray-900">Notifications</h3>
          </div>

          {[
            {
              key: 'videoComplete' as const,
              title: 'Video Complete',
              description: 'Get notified when your video is ready',
            },
            {
              key: 'credits' as const,
              title: 'Credits Running Low',
              description: 'Alert when credits are below your limit',
            },
            {
              key: 'newFeatures' as const,
              title: 'New Features',
              description: 'Updates about templates, voices, and tools',
            },
            {
              key: 'marketing' as const,
              title: 'Marketing Emails',
              description: 'Tips, offers, and promotions',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="px-4 py-3 flex items-center justify-between border-b last:border-b-0 border-gray-100"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
              <Switch
                checked={notifications[item.key]}
                onCheckedChange={(checked) => updateNotificationValue(item.key, checked)}
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base text-gray-900">Help & Support</h3>
          </div>

          {['Help Center', 'Contact Support', 'Privacy Policy'].map((label) => (
            <button
              key={label}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b last:border-b-0 border-gray-100"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-900">{label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </main>
    </div>
  );
}
