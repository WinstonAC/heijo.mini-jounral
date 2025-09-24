'use client';

import { useState, useEffect } from 'react';
import { getPrompt, logPromptHistory } from '@/lib/pickPrompt';

interface PromptChipProps {
  userId: string;
}

type PromptState = 'initial' | 'showing' | 'accepted' | 'skipped';

export default function PromptChip({ userId }: PromptChipProps) {
  const [state, setState] = useState<PromptState>('initial');
  const [prompt, setPrompt] = useState<{ id: string; text: string } | null>(null);

  const handleYes = async () => {
    if (state === 'initial') {
      // Show prompt
      const todayISO = new Date().toISOString().split('T')[0];
      const promptData = getPrompt(userId, todayISO);
      setPrompt(promptData);
      setState('showing');
    } else if (state === 'showing') {
      // Accept prompt
      if (prompt) {
        logPromptHistory(userId, prompt.id);
        setState('accepted');
      }
    }
  };

  const handleNo = () => {
    if (state === 'showing') {
      setState('skipped');
    }
  };

  // Reset state daily
  useEffect(() => {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('heijo-prompt-reset');
    
    if (lastReset !== today) {
      setState('initial');
      setPrompt(null);
      localStorage.setItem('heijo-prompt-reset', today);
    }
  }, []);

  if (state === 'accepted' || state === 'skipped') {
    return null; // Hide after interaction
  }

  return (
    <div className="lcd flex items-center gap-2">
      {state === 'initial' && (
        <>
          <span>PROMPT TODAY?</span>
          <button
            onClick={handleYes}
            className="px-2 py-1 text-xs border border-[var(--ui-silver)] rounded hover:bg-[var(--ui-press)] hover:text-white transition-colors"
          >
            YES
          </button>
          <button
            onClick={handleNo}
            className="px-2 py-1 text-xs border border-[var(--ui-silver)] rounded hover:bg-gray-100 transition-colors"
          >
            NO
          </button>
        </>
      )}
      
      {state === 'showing' && prompt && (
        <>
          <span className="max-w-xs truncate">{prompt.text}</span>
          <button
            onClick={handleYes}
            className="px-2 py-1 text-xs border border-[var(--ui-silver)] rounded hover:bg-[var(--ui-press)] hover:text-white transition-colors"
          >
            YES
          </button>
          <button
            onClick={handleNo}
            className="px-2 py-1 text-xs border border-[var(--ui-silver)] rounded hover:bg-gray-100 transition-colors"
          >
            NO
          </button>
        </>
      )}
    </div>
  );
}



