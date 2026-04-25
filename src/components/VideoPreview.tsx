import React, { useEffect, useState } from "react";
import {
  Download,
  Share2,
  Trash2,
  Edit,
  X,
  Instagram,
  Youtube,
  Facebook,
  Link2,
  Music4,
} from "lucide-react";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";

import { useNavigate, useParams } from 'react-router-dom';
import { projectsService, Project } from '../services/api/projects';

export function VideoPreview() {
  const { id: videoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;

    const fetchProject = async (trackView: boolean = false) => {
      try {
        if (trackView) {
          await projectsService.incrementViews(videoId);
        }
        const fetched = await projectsService.getProject(videoId);
        if (isMounted) {
          setProject(fetched);
        }
      } catch (err) {
        console.error("Failed to load project", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProject(true);

    const intervalId = window.setInterval(() => {
      fetchProject();
    }, 4000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [videoId]);

  const downloadAsset = async (url: string, fileName: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download asset.');
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleDownload = async () => {
    if (!project?.videoUrl) return;

    try {
      await projectsService.incrementDownloads(project.id);
      await downloadAsset(
        project.videoUrl,
        `${(project.title || 'video').replace(/[^\w-]+/g, '_')}.mp4`
      );
    } catch (error) {
      console.error('Failed to download video:', error);
      window.open(project.videoUrl, '_blank');
    }
  };

  const handleAudioDownload = async () => {
    if (!project?.audioUrl) return;

    try {
      await downloadAsset(
        project.audioUrl,
        `${(project.title || 'video').replace(/[^\w-]+/g, '_')}-audio.mp3`
      );
    } catch (error) {
      console.error('Failed to download audio:', error);
      window.open(project.audioUrl, '_blank');
    }
  };

  const handleCopyAssetLink = async () => {
    if (!project?.videoUrl) return;

    try {
      await navigator.clipboard.writeText(project.videoUrl);
    } catch (error) {
      console.error('Failed to copy asset link:', error);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: project?.title || 'AI Video Project',
          text: 'Check out this AI-generated video project.',
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error('Failed to share video:', error);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    const confirmed = window.confirm(`Delete "${project.title}"?`);
    if (!confirmed) return;

    try {
      await projectsService.deleteProject(project.id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your video...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <p className="text-gray-500">Video not found.</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const durationStr = project.duration ? `0:${project.duration.toString().padStart(2, '0')}` : "0:15";
  const sceneCount = project.metadata?.sceneCount || project.metadata?.scenes?.length || 0;
  const scriptProvider = project.metadata?.scriptProvider || 'fallback';
  const visualProvider = project.metadata?.visualProvider || 'local-render';
  const audioProvider = project.metadata?.audioProvider || 'unknown';
  const qualityTier = project.metadata?.qualityTier || 'standard';
  const scenes = project.metadata?.scenes || [];
  const subtitles = project.metadata?.subtitles || [];
  const exportOptions = [
    {
      label: 'Original MP4',
      desc: 'Full rendered video export',
      action: handleDownload,
      icon: Download,
      disabled: !project.videoUrl,
    },
    {
      label: 'Narration Audio',
      desc: 'Download the generated voice track',
      action: handleAudioDownload,
      icon: Music4,
      disabled: !project.audioUrl,
    },
    {
      label: 'Copy Video Link',
      desc: 'Copy direct asset URL',
      action: handleCopyAssetLink,
      icon: Link2,
      disabled: !project.videoUrl,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.h1
              className="text-xl text-gray-900"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Video Preview
            </motion.h1>
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl aspect-[9/16] max-w-sm mx-auto relative group flex items-center justify-center">
            {project.videoUrl ? (
              <video
                src={project.videoUrl}
                className="w-full h-full object-contain bg-black"
                controls
                autoPlay
                loop
              />
            ) : (
              <div className="relative w-full h-full">
                <ImageWithFallback
                  src={project.thumbnailUrl || "https://images.unsplash.com/photo-1632187989763-c9c620420b4d?w=1080"}
                  alt="Video preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-semibold">
                  Video still processing or missing.
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl text-gray-900 mb-5">
            {project.title || "Untitled Project"}
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Duration:</span>
              <span className="text-gray-900">{durationStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Format:</span>
              <span className="text-gray-900">{project.format || '9:16'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Voice:</span>
              <span className="text-gray-900 capitalize">{project.voiceName || 'System'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Mood:</span>
              <span className="text-gray-900 capitalize">{project.mood || 'Standard'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Scenes:</span>
              <span className="text-gray-900">{sceneCount || 'Auto'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Script:</span>
              <span className="text-gray-900 capitalize">{scriptProvider.replace(/-/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Visuals:</span>
              <span className="text-gray-900 capitalize">{visualProvider.replace(/-/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Audio:</span>
              <span className="text-gray-900 capitalize">{audioProvider.replace(/-/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Quality:</span>
              <span className="text-gray-900 capitalize">{qualityTier}</span>
            </div>
          </div>
        </motion.div>

        {project.status === 'failed' && project.metadata?.lastError && (
          <motion.div
            className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {project.metadata.lastError}
          </motion.div>
        )}

        <motion.div
          className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 mb-6 border border-purple-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-base text-gray-900 mb-4">
            Quick Share
          </h3>
          <div className="flex gap-3">
            {[
              { icon: Instagram, name: "Instagram", color: "from-pink-500 to-purple-500" },
              { icon: Youtube, name: "YouTube", color: "from-red-500 to-red-600" },
              { icon: Facebook, name: "Facebook", color: "from-blue-500 to-blue-600" },
            ].map((platform) => {
              const Icon = platform.icon;
              return (
                <motion.button
                  key={platform.name}
                  className={`flex-1 p-4 bg-gradient-to-br ${platform.color} text-white rounded-xl shadow-md hover:shadow-lg transition-all`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-xs">{platform.name}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handleDownload}
            disabled={!project.videoUrl}
            className="h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="h-14 rounded-2xl border-2 flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <Share2 className="w-5 h-5" />
            Share
          </Button>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={() => navigate('/create')}
            variant="outline"
            className="h-14 rounded-2xl border-2 flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <Edit className="w-5 h-5" />
            Edit
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            className="h-14 rounded-2xl border-2 flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
            Delete
          </Button>
        </motion.div>

        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-base text-gray-900 mb-4">Scene Storyboard</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {scenes.length > 0 ? scenes.map((scene, index) => (
              <motion.div
                key={`${scene.title}-${index}`}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + index * 0.05 }}
              >
                <div className="aspect-[9/16] bg-gray-100">
                  {scene.imageUrl ? (
                    <ImageWithFallback
                      src={scene.imageUrl}
                      alt={scene.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No scene image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-900 mb-1">{scene.title}</p>
                  <p className="text-xs text-gray-600 mb-2">{scene.caption}</p>
                  <p className="text-xs text-gray-500">{scene.duration.toFixed(1)}s</p>
                </div>
              </motion.div>
            )) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 text-sm text-gray-500">
                Scene previews will appear after rendering completes.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-base text-gray-900 mb-4">Subtitle Preview</h3>
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {subtitles.length > 0 ? subtitles.slice(0, 6).map((entry, index) => (
              <div key={`${entry.start}-${index}`} className="p-4">
                <p className="text-xs text-gray-500 mb-1">
                  {entry.start.toFixed(1)}s - {entry.end.toFixed(1)}s
                </p>
                <p className="text-sm text-gray-800">{entry.text}</p>
              </div>
            )) : (
              <div className="p-5 text-sm text-gray-500">
                Subtitle lines will appear here after render completes.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-base text-gray-900 mb-4">Export Options</h3>
          <div className="space-y-3">
            {exportOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.label}
                  onClick={option.action}
                  disabled={option.disabled}
                  className="w-full p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-600 hover:shadow-md transition-all text-left relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + index * 0.08 }}
                  whileHover={option.disabled ? undefined : { x: 4 }}
                >
                  {!option.disabled && index === 0 && (
                    <span className="absolute top-3 right-3 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Ready
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 mb-1">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
