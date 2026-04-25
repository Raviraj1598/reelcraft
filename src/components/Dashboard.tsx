import React, { useEffect, useState } from 'react';
import { Plus, PlayCircle, Clock, Sparkles, TrendingUp, Settings, User, CreditCard, Star, Film } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { creditsService, UserCredits } from '../services/api/credits';
import { Project, projectsService } from '../services/api/projects';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../lib/config';

interface ProviderStatus {
  mockAi: boolean;
  script: { provider: string; enabled: boolean };
  visuals: { provider: string; enabled: boolean; configuredMode: string };
  audio: { provider: string; enabled: boolean };
}

function formatRelativeDate(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes} min ago`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(diffMs / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    totalViews: 0,
    totalDownloads: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [userProjects, userCredits, projectStats] = await Promise.all([
          projectsService.getUserProjects(),
          creditsService.getUserCredits(),
          projectsService.getProjectStats(),
        ]);

        setProjects(userProjects);
        setCredits(userCredits);
        setStats(projectStats);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    const loadProviderStatus = async () => {
      try {
        const baseUrl = config.api.baseURL || '';
        const response = await fetch(`${baseUrl}/api/health`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setProviderStatus(data.providers || null);
      } catch (error) {
        console.error('Failed to load provider status:', error);
      }
    };

    void loadProviderStatus();
  }, []);

  const dashboardStats = [
    { icon: PlayCircle, label: 'Videos', value: String(stats.total), gradient: 'from-purple-500 to-purple-600' },
    { icon: TrendingUp, label: 'Views', value: stats.totalViews.toLocaleString(), gradient: 'from-blue-500 to-blue-600' },
    { icon: Sparkles, label: 'Credits', value: String(credits?.credits ?? 0), gradient: 'from-green-500 to-green-600' },
    { icon: Clock, label: 'Processing', value: String(stats.processing), gradient: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl text-gray-900">VideoAI</span>
          </motion.div>
          
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              onClick={() => navigate('/subscription')}
              className="p-2.5 hover:bg-purple-50 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <CreditCard className="w-5 h-5 text-purple-600" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:scale-105 active:scale-95">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                {user?.name ? (
                  <span className="text-xs text-white">{user.name.slice(0, 2).toUpperCase()}</span>
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
            </button>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <motion.div
          className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 rounded-2xl p-6 mb-8 text-white shadow-xl overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
          <div className="relative z-10">
            <h2 className="text-2xl mb-2">Welcome back! 👋</h2>
            <p className="text-purple-100 mb-4">
              {credits
                ? `${user?.name || 'Creator'}, ${credits.subscriptionTier.toUpperCase()} plan active. Ready to create something amazing today?`
                : 'Ready to create something amazing today?'}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span>You have <strong>{credits?.credits ?? 0} credits</strong> remaining</span>
            </div>
            {providerStatus && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                  Script: {providerStatus.script.provider}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                  Visuals: {providerStatus.visuals.provider}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                  Audio: {providerStatus.audio.provider}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={() => navigate('/create')}
            className="w-full sm:w-auto h-16 px-10 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white rounded-2xl shadow-xl hover:shadow-2xl flex items-center gap-3 text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-6 h-6" />
            Create New Video
          </Button>
        </motion.div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Film className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl text-gray-900">Your Projects</h2>
            </div>
            <button className="text-purple-600 hover:text-purple-700 text-sm transition-colors">
              {projects.length} total
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-gray-500">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-dashed border-gray-200 text-center">
              <h3 className="text-lg text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-5">Create your first AI video to see it here.</p>
              <Button onClick={() => navigate('/create')} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create First Video
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  onClick={() => navigate('/preview/' + project.id)}
                  className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all cursor-pointer group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200">
                    <ImageWithFallback
                      src={project.thumbnailUrl || 'https://images.unsplash.com/photo-1632187989763-c9c620420b4d?w=1080'}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-3 right-3 px-2.5 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg text-xs text-white shadow-lg">
                      {`0:${project.duration.toString().padStart(2, '0')}`}
                    </div>
                    {project.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="relative">
                          <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                          <Sparkles className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {project.status === 'completed' && (
                        <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
                          <PlayCircle className="w-8 h-8 text-purple-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base text-gray-900 mb-2 line-clamp-1">
                      {project.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{formatRelativeDate(project.createdAt)}</span>
                      {project.metadata?.qualityTier && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          project.metadata.qualityTier === 'enhanced'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {project.metadata.qualityTier}
                        </span>
                      )}
                      {project.status === 'completed' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Ready</span>
                      )}
                      {project.status === 'processing' && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse" />
                          Processing
                        </span>
                      )}
                      {project.status === 'draft' && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Draft</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}