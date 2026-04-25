import React, { useState } from 'react';
import { Sparkles, Video, Wand2, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const onboardingSteps = [
  {
    icon: Sparkles,
    title: "Create AI Videos in Seconds",
    description: "Transform your ideas into stunning videos with the power of AI. No editing skills required.",
    gradient: "from-purple-500 via-pink-500 to-red-500",
  },
  {
    icon: Wand2,
    title: "Choose from Smart Templates",
    description: "Select from professionally designed templates for reels, ads, stories, and more.",
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
  },
  {
    icon: Video,
    title: "AI-Powered Voiceovers",
    description: "Pick from dozens of natural-sounding AI voices to bring your content to life.",
    gradient: "from-orange-500 via-red-500 to-pink-500",
  },
  {
    icon: Zap,
    title: "Publish & Share Instantly",
    description: "Export your videos in perfect format for Instagram, TikTok, YouTube, and beyond.",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
  },
];

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate(user ? '/dashboard' : '/');
    }
  };

  const handleSkip = () => {
    navigate(user ? '/dashboard' : '/');
  };

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 -left-20 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-72 h-72 bg-blue-200 rounded-full opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-12 justify-center">
          {onboardingSteps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === currentStep 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600' 
                  : index < currentStep 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600' 
                  : 'bg-gray-200'
              }`}
              initial={{ width: 6 }}
              animate={{ width: index === currentStep ? 32 : 6 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <motion.div
                className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-2xl`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Icon className="w-12 h-12 text-white" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="text-center mb-12">
              <motion.h1
                className="text-3xl mb-4 text-gray-900 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {step.title}
              </motion.h1>
              <motion.p
                className="text-lg text-gray-600 leading-relaxed px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {step.description}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Buttons */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleNext}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {currentStep === onboardingSteps.length - 1 ? "Get Started" : "Next"}
          </Button>
          
          {currentStep < onboardingSteps.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full h-12 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Skip
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}