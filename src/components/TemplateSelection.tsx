import React, { useState } from 'react';
import { Instagram, Youtube, TrendingUp, BookOpen, Zap, Heart, Briefcase, Sparkles } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

interface TemplateSelectionProps {
  onSelect: (template: string, mood: string) => void;
  initialTemplate?: string;
  initialMood?: string;
}

const templates = [
  {
    id: 'reel',
    name: 'Instagram Reel',
    icon: Instagram,
    thumbnail: 'https://images.unsplash.com/photo-1579176647030-bd86f6fd4e1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbnN0YWdyYW0lMjByZWVsc3xlbnwxfHx8fDE3NjgwMzc0NjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '15-60s',
    description: 'Vertical format perfect for Instagram',
  },
  {
    id: 'short',
    name: 'YouTube Short',
    icon: Youtube,
    thumbnail: 'https://images.unsplash.com/photo-1541877944-ac82a091518a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3V0dWJlJTIwc2hvcnRzfGVufDF8fHx8MTc2ODAzNzQ2NXww&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '15-60s',
    description: 'Snackable content for YouTube',
  },
  {
    id: 'ad',
    name: 'Product Ad',
    icon: TrendingUp,
    thumbnail: 'https://images.unsplash.com/photo-1734547458485-e7cc76c41d5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZHZlcnRpc2VtZW50JTIwcG9zdGVyfGVufDF8fHx8MTc2ODAzNzQ2NXww&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '10-30s',
    description: 'Marketing videos that convert',
  },
  {
    id: 'story',
    name: 'Storytelling',
    icon: BookOpen,
    thumbnail: 'https://images.unsplash.com/photo-1617575521317-d2974f3b56d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9yeXRlbGxpbmd8ZW58MXx8fHwxNzY4MDM3NDY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    duration: '30-90s',
    description: 'Engaging narrative content',
  },
];

const moods = [
  { id: 'energetic', name: 'Energetic', icon: Zap, color: 'from-orange-500 to-red-500' },
  { id: 'professional', name: 'Professional', icon: Briefcase, color: 'from-blue-500 to-indigo-500' },
  { id: 'calm', name: 'Calm', icon: Heart, color: 'from-green-500 to-teal-500' },
  { id: 'creative', name: 'Creative', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
];

export function TemplateSelection({
  onSelect,
  initialTemplate = '',
  initialMood = '',
}: TemplateSelectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialTemplate);
  const [selectedMood, setSelectedMood] = useState<string>(initialMood);

  const handleContinue = () => {
    if (selectedTemplate && selectedMood) {
      onSelect(selectedTemplate, selectedMood);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Template Selection */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl text-gray-900 mb-2">Choose a Template</h2>
        <p className="text-gray-600 mb-6">Pick the perfect format for your content</p>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((template, index) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.id;
            
            return (
              <motion.button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`relative bg-white rounded-2xl overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-purple-600 shadow-xl scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  <ImageWithFallback
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 bg-purple-600/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                  {isSelected && (
                    <motion.div
                      className="absolute top-2 right-2 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-600'}`} />
                    <span className={`text-sm ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>{template.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{template.description}</p>
                  <span className={`text-xs ${isSelected ? 'text-purple-600' : 'text-gray-600'}`}>{template.duration}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Mood Selection */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl text-gray-900 mb-2">Select a Mood</h2>
        <p className="text-gray-600 mb-6">Set the tone and energy of your video</p>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {moods.map((mood, index) => {
            const Icon = mood.icon;
            const isSelected = selectedMood === mood.id;
            
            return (
              <motion.button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`p-5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mood.color} flex items-center justify-center mb-3 mx-auto shadow-lg`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon className="w-7 h-7 text-white" />
                </motion.div>
                <p className={`text-sm text-center ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>{mood.name}</p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={handleContinue}
          disabled={!selectedTemplate || !selectedMood}
          className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Continue to Script
        </Button>
      </motion.div>
    </div>
  );
}