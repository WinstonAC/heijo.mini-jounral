'use client';

import { useState, useEffect } from 'react';
import { getPrompt, logPromptHistory } from '@/lib/pickPrompt';

interface PromptTickerProps {
  userId: string;
  onPromptSelect: (prompt: { id: string; text: string }) => void;
}

type PromptState = 'ticking' | 'showing' | 'selected' | 'hidden';

export default function PromptTicker({ userId, onPromptSelect }: PromptTickerProps) {
  const [state, setState] = useState<PromptState>('ticking');
  const [currentPrompt, setCurrentPrompt] = useState<{ id: string; text: string } | null>(null);
  const [hasShownToday, setHasShownToday] = useState(false);

  // Check if we've shown a prompt today
  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('heijo-prompt-shown');
    if (lastShown === today) {
      setHasShownToday(true);
      setState('hidden');
    } else {
      // Show prompt question on load if not shown today
      setState('ticking');
    }
  }, []);

  // Debug: Reset prompt for today (remove this in production)
  const resetPromptForToday = () => {
    localStorage.removeItem('heijo-prompt-shown');
    setHasShownToday(false);
    setState('ticking');
  };

  const handleYes = () => {
    // Get the actual daily prompt
    const todayISO = new Date().toISOString().split('T')[0];
    const promptData = getPrompt(userId, todayISO);
    setCurrentPrompt(promptData);
    setState('showing');
  };

  const handleNo = () => {
    setState('hidden');
    // Mark as shown today even if declined
    const today = new Date().toDateString();
    localStorage.setItem('heijo-prompt-shown', today);
  };

  const handleSelectPrompt = () => {
    if (currentPrompt) {
      logPromptHistory(userId, currentPrompt.id);
      onPromptSelect(currentPrompt);
      setState('selected');
      
      // Mark as shown today
      const today = new Date().toDateString();
      localStorage.setItem('heijo-prompt-shown', today);
    }
  };

  if (state === 'hidden' || hasShownToday) {
    return null;
  }

  return (
    <div className="w-full mb-6">
      {state === 'ticking' && (
        <div className="bg-heijo-card border border-heijo-border rounded-lg p-6 shadow-sm animate-fade-in">
          <div className="text-center">
            <p className="text-heijo-text font-light text-lg mb-4">
              Do you want a journal prompt today?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleYes}
                className="px-6 py-3 text-sm font-light bg-graphite-charcoal text-text-inverse hover:bg-heijo-text transition-colors duration-200 rounded-lg"
              >
                Yes
              </button>
              <button
                onClick={handleNo}
                className="px-6 py-3 text-sm font-light border border-heijo-border text-text-secondary hover:bg-soft-silver transition-colors duration-200 rounded-lg"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {state === 'showing' && currentPrompt && (
        <div className="bg-[#2A5A2A] border border-[#B8D8B8] rounded-lg p-6 shadow-[0_0_20px_rgba(184,184,184,0.1)] animate-scale-in relative overflow-hidden">
          {/* Green background animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A7A4A] to-[#2A5A2A] animate-pulse opacity-20"></div>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <p className="text-[#E8E8E8] font-light text-lg flex-1 pr-6">
              {currentPrompt.text}
            </p>
            <button
              onClick={handleSelectPrompt}
              className="px-6 py-3 text-sm font-light bg-[#C7C7C7] text-[#1C1C1C] hover:bg-[#D8D8D8] transition-colors duration-200 rounded-lg"
            >
              Use This Prompt
            </button>
          </div>
        </div>
      )}

      {state === 'selected' && currentPrompt && (
        <div className="bg-[#2A5A2A] border border-[#B8D8B8] rounded-lg p-4 shadow-[0_0_20px_rgba(184,184,184,0.1)] animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-[#E8E8E8] font-light">
              {currentPrompt.text}
            </p>
            <div className="text-xs text-[#4A7A4A] font-light">
              SELECTED
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
