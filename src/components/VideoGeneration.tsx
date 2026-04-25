import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { videoWorkflowService } from '../services/videoWorkflow';
import { clearGenerationDraft, getGenerationDraft } from '../lib/appState';
import { config } from '../lib/config';

const generationSteps = [
  { id: 'queued', label: 'Queueing render job' },
  { id: 'scenes', label: 'Breaking script into scenes' },
  { id: 'voice', label: 'Generating voiceover' },
  { id: 'render', label: 'Rendering scene motion' },
  { id: 'subtitles', label: 'Adding subtitles' },
  { id: 'complete', label: 'Finalizing video' },
];

interface ProviderStatus {
  mockAi: boolean;
  script: { provider: string; enabled: boolean };
  visuals: { provider: string; enabled: boolean; configuredMode: string };
  audio: { provider: string; enabled: boolean };
}

export function VideoGeneration() {
  const [currentStep, setCurrentStep] = useState('queued');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Starting...');
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const [videoData] = useState(() => location.state?.videoData || getGenerationDraft());

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
      } catch (fetchError) {
        console.error('Failed to load provider status', fetchError);
      }
    };

    void loadProviderStatus();
  }, []);

  useEffect(() => {
    if (!videoData) {
      navigate('/create');
      return;
    }

    let hasNavigated = false;

    const startGeneration = async () => {
      try {
        await videoWorkflowService.generateVideo(
          {
            title: videoData.template + ' Video',
            script: videoData.script, // if script exists, it uses it
            voiceId: videoData.voice || 'voice-1',
            template: videoData.template,
            mood: videoData.mood || 'default',
          },
          (status) => {
            if (status.error) {
              setError(status.error);
              return;
            }
            setCurrentStep(status.step);
            setProgress(status.progress);
            setMessage(status.message);

            if (status.step === 'complete' && !hasNavigated && status.projectId) {
              hasNavigated = true;
              clearGenerationDraft();
              setTimeout(() => {
                navigate('/preview/' + status.projectId);
              }, 1000); // short delay to show 100% completion
            }
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error during generation.');
      }
    };

    startGeneration();
  }, [navigate, videoData]);

  const currentStepIndex = generationSteps.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-purple-200 rounded-full opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -80, 0],
            y: [0, -60, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 flex items-center justify-center shadow-2xl relative"
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-14 h-14 text-white" />
            <motion.div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>

        {/* Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl text-gray-900 mb-3">Creating Your Video</h2>
          {error ? (
            <p className="text-lg text-red-600 font-semibold">{error}</p>
          ) : (
            <p className="text-lg text-gray-600">{message}</p>
          )}
        </motion.div>

        {providerStatus && !error && (
          <motion.div
            className="mb-6 p-4 bg-white/80 rounded-2xl border border-gray-200 shadow-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-sm text-gray-900 mb-2">Active Providers</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>Script: {providerStatus.script.provider}</p>
              <p>Visuals: {providerStatus.visuals.provider}</p>
              <p>Audio: {providerStatus.audio.provider}</p>
            </div>
          </motion.div>
        )}

        {/* Progress Bar */}
        {!error && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {Math.round(progress)}% complete
              </p>
              <div className="flex items-center gap-1.5 text-sm text-purple-600">
                <Zap className="w-4 h-4" />
                <span>Turbo Mode</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {generationSteps.map((step, index) => {
            const isComplete = currentStep === 'complete' || index < currentStepIndex;
            const isCurrent = index === currentStepIndex && currentStep !== 'complete';

            return (
              <motion.div
                key={index}
                className={`flex items-center gap-4 p-5 rounded-2xl transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 shadow-lg scale-105'
                    : isComplete
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
                    : 'bg-white border-2 border-gray-100'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isComplete
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg'
                      : isCurrent
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg'
                      : 'bg-gray-200'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : isCurrent ? (
                    <motion.div
                      className="w-4 h-4 bg-white rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : (
                    <div className="w-4 h-4 bg-white/70 rounded-full" />
                  )}
                </div>
                <span
                  className={`text-sm transition-all ${
                    isCurrent || isComplete ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Fun Fact */}
        <motion.div
          className="p-5 bg-gradient-to-r from-white to-purple-50 rounded-2xl border-2 border-purple-100 shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm text-gray-900 mb-1">Did you know?</p>
              <p className="text-sm text-gray-600">
                AI can generate videos 1000x faster than traditional editing!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}