'use client';

import { useState, useRef, useEffect } from 'react';
import { enhancedMicButton, VoiceMetrics } from '@/lib/voiceToText';

interface MicButtonProps {
  onTranscript: (text: string, isFinal?: boolean) => void;
  onError?: (error: string) => void;
  lang?: string;
}

export default function MicButton({ onTranscript, onError, lang = 'en-US' }: MicButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [metrics, setMetrics] = useState<VoiceMetrics | null>(null);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const micRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const initializeMic = async () => {
      try {
        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setIsSupported(false);
          return;
        }

        // Check microphone permission
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setPermissionState(permission.state);
            
            permission.onchange = () => {
              setPermissionState(permission.state);
            };
          } catch (error) {
            console.warn('Permission API not supported:', error);
          }
        }

        // Initialize enhanced mic button
        const initialized = await enhancedMicButton.initialize();
        setIsInitialized(initialized);
        setIsSupported(initialized);
      } catch (error) {
        console.error('Failed to initialize microphone:', error);
        setIsSupported(false);
      }
    };

    initializeMic();

    return () => {
      enhancedMicButton.destroy();
    };
  }, []);

  const toggleListening = async () => {
    if (!isInitialized || !isSupported) {
      onError?.('Microphone not available or not initialized');
      return;
    }

    if (isListening) {
      enhancedMicButton.stopListening();
      setIsListening(false);
    } else {
      try {
        // Request microphone permission if needed
        if (permissionState === 'prompt' || permissionState === 'unknown') {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setPermissionState('granted');
        }

        enhancedMicButton.startListening(
          (text, isFinal) => {
            onTranscript(text, isFinal);
            if (isFinal) {
              // Update metrics after each final result
              setMetrics(enhancedMicButton.getMetrics());
            }
          },
          (error) => {
            console.error('Voice recognition error:', error);
            setIsListening(false);
            onError?.(error);
          },
          () => {
            setIsListening(true);
          },
          () => {
            setIsListening(false);
            setMetrics(enhancedMicButton.getMetrics());
          }
        );
      } catch (error) {
        console.error('Failed to start listening:', error);
        onError?.('Failed to access microphone. Please check permissions.');
        setPermissionState('denied');
      }
    }
  };

  const getButtonState = () => {
    if (!isSupported) return 'unsupported';
    if (permissionState === 'denied') return 'denied';
    if (isListening) return 'listening';
    return 'ready';
  };

  const getButtonClass = () => {
    const state = getButtonState();
    const baseClass = 'w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50';
    
    switch (state) {
      case 'listening':
        return `${baseClass} border-[#0D6EFD] text-[#0D6EFD] bg-transparent record-btn is-recording`;
      case 'denied':
        return `${baseClass} border-red-300 text-red-500 bg-red-50 cursor-not-allowed`;
      case 'unsupported':
        return `${baseClass} border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed`;
      default:
        return `${baseClass} border-[#C7C7C7] text-[#6A6A6A] hover:border-[#8A8A8A] hover:text-[#1A1A1A] hover:bg-[#F0F0F0]`;
    }
  };

  const getTooltipText = () => {
    const state = getButtonState();
    switch (state) {
      case 'listening':
        return 'Stop recording';
      case 'denied':
        return 'Microphone permission denied';
      case 'unsupported':
        return 'Voice recognition not supported';
      default:
        return 'Start voice recording';
    }
  };

  if (!isSupported) {
    return (
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-gray-300 text-gray-400 bg-gray-50 flex items-center justify-center cursor-not-allowed">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        ref={micRef}
        onClick={toggleListening}
        disabled={!isSupported || permissionState === 'denied'}
        className={getButtonClass()}
        title={getTooltipText()}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2A2A2A] text-[#E8E8E8] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
        {getTooltipText()}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-[#2A2A2A]"></div>
      </div>

      {/* Metrics display (for debugging) */}
      {metrics && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
          <div>First partial: {metrics.firstPartialLatency.toFixed(0)}ms</div>
          <div>Final: {metrics.finalLatency.toFixed(0)}ms</div>
          <div>Chunks: {metrics.chunksProcessed}</div>
        </div>
      )}
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}



