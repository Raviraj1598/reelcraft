import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from './ui/button';
import { TemplateSelection } from './TemplateSelection';
import { ScriptInput } from './ScriptInput';
import { VoiceSelection } from './VoiceSelection';

import { useNavigate } from 'react-router-dom';
import { getGenerationDraft, saveGenerationDraft } from '../lib/appState';

export interface VideoCreationData {
  template: string;
  script: string;
  voice: string;
  mood: string;
  prompt?: string;
}

type Step = 'template' | 'script' | 'voice';

function getCurrentStepFromDraft(data: Partial<VideoCreationData>): Step {
  if (data.template && data.mood && data.script) {
    return 'voice';
  }

  if (data.template && data.mood) {
    return 'script';
  }

  return 'template';
}

export function CreateVideo() {
  const [videoData, setVideoData] = useState<Partial<VideoCreationData>>(() => getGenerationDraft() || {});
  const [currentStep, setCurrentStep] = useState<Step>(() => getCurrentStepFromDraft(getGenerationDraft() || {}));
  const navigate = useNavigate();

  const steps: Step[] = ['template', 'script', 'voice'];
  const currentStepIndex = steps.indexOf(currentStep);

  useEffect(() => {
    if (Object.keys(videoData).length > 0) {
      saveGenerationDraft(videoData);
    }
  }, [videoData]);

  const handleTemplateSelect = (template: string, mood: string) => {
    setVideoData((currentData) => ({ ...currentData, template, mood }));
    setCurrentStep('script');
  };

  const handleScriptSubmit = (script: string, prompt?: string) => {
    setVideoData((currentData) => ({ ...currentData, script, prompt }));
    setCurrentStep('voice');
  };

  const handleVoiceSelect = (voice: string) => {
    const finalData = { ...videoData, voice } as VideoCreationData;
    setVideoData(finalData);
    saveGenerationDraft(finalData);
    navigate('/generating', { state: { videoData: finalData } });
  };

  const handleStepClick = (step: Step) => {
    const stepIndex = steps.indexOf(step);
    if (stepIndex <= currentStepIndex) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl text-gray-900">Create Video</h1>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => handleStepClick(step)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentStep === step
                      ? 'bg-purple-100 text-purple-700'
                      : index < currentStepIndex
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  disabled={index > currentStepIndex}
                >
                  {index < currentStepIndex && (
                    <Check className="w-4 h-4" />
                  )}
                  <span className="text-sm capitalize">{step}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {currentStep === 'template' && (
          <TemplateSelection
            onSelect={handleTemplateSelect}
            initialTemplate={videoData.template}
            initialMood={videoData.mood}
          />
        )}
        {currentStep === 'script' && (
          <ScriptInput
            onSubmit={handleScriptSubmit}
            onBack={() => setCurrentStep('template')}
            initialScript={videoData.script}
            initialPrompt={videoData.prompt}
            template={videoData.template}
            mood={videoData.mood}
          />
        )}
        {currentStep === 'voice' && (
          <VoiceSelection
            onSelect={handleVoiceSelect}
            onBack={() => setCurrentStep('script')}
            initialVoice={videoData.voice}
          />
        )}
      </main>
    </div>
  );
}