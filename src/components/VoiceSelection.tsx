import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { elevenlabsService, Voice } from '../services/ai/elevenlabs';

interface VoiceSelectionProps {
  onSelect: (voice: string) => void;
  onBack: () => void;
  initialVoice?: string;
}

export function VoiceSelection({ onSelect, onBack, initialVoice = '' }: VoiceSelectionProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(initialVoice);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const voicesData = await elevenlabsService.getVoices();
      setVoices(voicesData);
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVoiceColor = (index: number): string => {
    const colors = [
      'from-pink-500 to-rose-500',
      'from-blue-500 to-indigo-500',
      'from-orange-500 to-red-500',
      'from-teal-500 to-green-500',
      'from-purple-500 to-pink-500',
      'from-cyan-500 to-blue-500',
      'from-amber-500 to-yellow-500',
      'from-emerald-500 to-green-500',
    ];
    return colors[index % colors.length];
  };

  const getVoiceTags = (voice: Voice): string[] => {
    const tags = [];
    
    if (voice.category) tags.push(voice.category);
    if (voice.age === 'young') tags.push('Young');
    if (voice.age === 'middle-aged') tags.push('Mature');
    
    return tags.length > 0 ? tags : ['AI Voice'];
  };

  const handlePlayPreview = (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(voiceId);
      // Simulate audio playback
      setTimeout(() => {
        setPlayingVoice(null);
      }, 3000);
    }
  };

  const handleGenerate = () => {
    if (selectedVoice) {
      onSelect(selectedVoice);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl text-gray-900 mb-2">Choose AI Voice</h2>
        <p className="text-gray-600 mb-6">Select the perfect voice for your video</p>
      </motion.div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {loading ? (
          <div className="col-span-2 text-center py-8">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading voices...</p>
          </div>
        ) : (
          voices.map((voice, index) => {
            const isSelected = selectedVoice === voice.id;
            const isPlaying = playingVoice === voice.id;

            return (
              <motion.button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`bg-white rounded-2xl p-6 border-2 transition-all text-left relative overflow-hidden ${
                  isSelected
                    ? 'border-purple-600 shadow-xl scale-[1.02]'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 -z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getVoiceColor(index)} flex items-center justify-center shadow-lg relative`}>
                      <Volume2 className="w-7 h-7 text-white" />
                      {isPlaying && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl bg-white"
                          initial={{ opacity: 0.5, scale: 1 }}
                          animate={{ opacity: 0, scale: 1.5 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg text-gray-900 mb-1">{voice.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{voice.gender} • {voice.accent}</p>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPreview(voice.id);
                    }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-md ${
                      isPlaying
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : isSelected
                        ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </motion.button>
                </div>

                <p className="text-sm text-gray-600 mb-4">{voice.description}</p>

                <div className="flex flex-wrap gap-2">
                  {getVoiceTags(voice).map((tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors capitalize ${
                        isSelected
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {isSelected && (
                  <motion.div
                    className="absolute top-4 right-4 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-14 rounded-2xl border-2 hover:bg-gray-50"
        >
          Back
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!selectedVoice}
          className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Generate Video
        </Button>
      </motion.div>
    </div>
  );
}