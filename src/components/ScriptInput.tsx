import React, { useState } from 'react';
import { Wand2, Copy, RefreshCw, Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { motion } from 'motion/react';
import { openaiService } from '../services/ai/openai';

interface ScriptInputProps {
  onSubmit: (script: string, prompt?: string) => void;
  onBack: () => void;
  initialScript?: string;
  initialPrompt?: string;
  template?: string;
  mood?: string;
}

export function ScriptInput({
  onSubmit,
  onBack,
  initialScript = '',
  initialPrompt = '',
  template = '',
  mood = '',
}: ScriptInputProps) {
  const [script, setScript] = useState(initialScript);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasContent = script.trim().length > 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (hasContent) {
        const response = await openaiService.improveScript(
          script,
          `Make it more engaging, visual, concise, and optimized for a ${template || 'general'} video with a ${mood || 'confident'} tone.`
        );
        setScript(response.script);
      } else {
        if (!prompt.trim()) {
          setError('Add a topic or product description first so AI knows what to write about.');
          return;
        }

        const response = await openaiService.generateScript({
          prompt,
          mood: mood || 'energetic',
          duration: 15,
          template: template || 'general',
        });
        setScript(response.script);
      }
    } catch (err) {
      setError('Failed to process script. Please try again.');
      console.error('Error processing script:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (script.trim()) {
      onSubmit(script, prompt.trim() || undefined);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const charCount = script.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl text-gray-900 mb-2">Write Your Script</h2>
        <p className="text-gray-600 mb-6">Describe your topic, then generate or refine a script built for short-form video</p>
      </motion.div>

      <motion.div
        className="mb-6 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <label className="block text-sm text-gray-900 mb-2">Video topic or offer</label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Promote my AI video app for small business owners"
          className="h-12 rounded-xl"
        />
        <p className="text-xs text-gray-500 mt-2">
          Include what the video is about, who it is for, and the main result or offer.
        </p>
      </motion.div>

      {/* AI Quick Actions */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap gap-3">
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="text-sm">
              {isGenerating 
                ? 'Processing...' 
                : hasContent ? '✨ Enhance with AI' : '✨ Generate Script'
              }
            </span>
          </motion.button>
          
          <motion.button
            onClick={() => {
              setScript('');
              setPrompt('');
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Clear</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Script Editor */}
      <motion.div
        className="bg-white rounded-2xl border-2 border-gray-200 shadow-md overflow-hidden mb-6 focus-within:border-purple-600 focus-within:shadow-lg transition-all"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Enter your script here or generate one from the topic above. Keep it concise, visual, and spoken-language friendly."
          className="min-h-[300px] resize-none border-0 focus-visible:ring-0 text-base p-6 bg-transparent"
        />
        
        {error && (
          <div className="px-6 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">
            {error}
          </div>
        )}
        
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span className="text-gray-600">
              <strong className="text-gray-900">{wordCount}</strong> words
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-600">
              <strong className="text-gray-900">{charCount}</strong> characters
            </span>
          </div>
          
          {script && (
            <motion.button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-purple-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Suggestions */}
      <motion.div
        className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 border border-blue-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm text-gray-900">Quick Tips:</h3>
        </div>
        <ul className="space-y-2.5">
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-purple-600 mt-0.5 text-base">✓</span>
            <span>Keep it under 150 words for best engagement</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-purple-600 mt-0.5 text-base">✓</span>
            <span>Start with a hook to grab attention in the first 3 seconds</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-purple-600 mt-0.5 text-base">✓</span>
            <span>End with a clear call-to-action</span>
          </li>
        </ul>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-14 rounded-2xl border-2 hover:bg-gray-50"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!script.trim()}
          className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Continue to Voice
        </Button>
      </motion.div>
    </div>
  );
}