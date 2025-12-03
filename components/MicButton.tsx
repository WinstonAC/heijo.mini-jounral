'use client';

import { useState, useRef, useEffect } from 'react';
import { createEnhancedMicButton, VoiceMetrics, EnhancedMicButton } from '@/lib/voiceToText';
import { useVoiceSettings } from '@/lib/voiceSettings';

/**
 * CODEX CHANGES INVESTIGATION:
 * 
 * The microphone functionality uses an enhanced implementation with:
 * 1. VoiceToTextEngine: Handles speech recognition with low-latency streaming
 * 2. VoiceActivityDetector: Uses Web Audio API for voice detection
 * 3. EnhancedMicButton: Combines both engines for optimal performance
 * 
 * Key features added by Codex:
 * - Streaming transcription with 500ms chunks for low latency
 * - Voice Activity Detection (VAD) using Web Audio API
 * - Comprehensive error handling and permission management
 * - Performance metrics tracking (latency, chunks processed)
 * - Automatic silence detection with 3-second timeout
 * 
 * The implementation is more sophisticated than basic Web Speech API usage.
 */

interface MicButtonProps {
  onTranscript: (text: string, isFinal?: boolean) => void;
  onError?: (error: string) => void;
  lang?: string; // Deprecated: use voiceSettings context instead
}

export default function MicButton({ onTranscript, onError, lang }: MicButtonProps) {
  const { selectedLanguage, provider } = useVoiceSettings();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [metrics, setMetrics] = useState<VoiceMetrics | null>(null);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const micRef = useRef<HTMLButtonElement>(null);
  const enhancedMicButtonRef = useRef<EnhancedMicButton | null>(null);

  useEffect(() => {
    const initializeMic = async () => {
      try {
        // Check for microphone API availability
        if (!navigator.mediaDevices) {
          console.log('Microphone not supported in this browser');
          setIsSupported(false);
          onError?.('Voice input is not supported on this device.');
          return;
        }

        // [Heijo Remediation 2025-01-06] Secure context fallback for localhost
        const isSecure = window.isSecureContext;
        const allowInsecureLocalhost = 
          !isSecure && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        if (!isSecure && !allowInsecureLocalhost) {
          console.log('Microphone requires HTTPS context');
          setIsSupported(false);
          onError?.('Voice input requires a secure connection (HTTPS).');
          return;
        }
        
        if (allowInsecureLocalhost) {
          console.warn('[Heijo][Mic] Insecure context detected — falling back for localhost testing');
        }

        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          console.log('Speech recognition not supported in this browser');
          setIsSupported(false);
          onError?.('Voice input is not supported on this device.');
          return;
        }

        // iOS Safari detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isIOS && isSafari) {
          console.warn('[Heijo][Mic] iOS Safari detected - voice dictation may have limitations');
        }

        console.log('Speech recognition and microphone APIs are available');

        // [Heijo Remediation 2025-01-06] Defensive permissions handling
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            console.log('Microphone permission state:', permission.state);
            setPermissionState(permission.state);
            
            if (permission.state === 'denied') {
              console.warn('[Heijo][Mic] Microphone access blocked — check browser settings');
              // Don't return here, allow user to try again
            }
            
            permission.onchange = () => {
              console.log('Microphone permission changed to:', permission.state);
              setPermissionState(permission.state);
            };
          } catch (error) {
            // Safari/Edge fallback — silently continue
            console.warn('[Heijo][Mic] Permission API not supported, continuing:', error);
          }
        }

        // Initialize enhanced mic button with current language and provider
        // Use selectedLanguage from context (will be loaded from localStorage by VoiceSettingsProvider)
        console.log(`Initializing enhanced microphone with language: ${selectedLanguage}, provider: ${provider}...`);
        const micButton = createEnhancedMicButton(selectedLanguage, provider);
        enhancedMicButtonRef.current = micButton;
        
        const initialized = await micButton.initialize();
        console.log('Enhanced microphone initialization result:', initialized);
        setIsInitialized(initialized);
        setIsSupported(Boolean(SpeechRecognition));
      } catch (error) {
        console.error('Failed to initialize microphone:', error);
        setIsSupported(false);
        const errorMessage = error instanceof Error ? error.message : 'Voice input is not supported on this device.';
        onError?.(errorMessage);
      }
    };

    initializeMic();

    return () => {
      if (enhancedMicButtonRef.current) {
        enhancedMicButtonRef.current.destroy();
        enhancedMicButtonRef.current = null;
      }
    };
  }, [selectedLanguage, provider]); // Re-initialize if language or provider changes

  const toggleListening = async () => {
    console.log('Mic button pressed');
    
    if (!enhancedMicButtonRef.current) {
      console.log('Enhanced mic button not initialized');
      onError?.('Voice recognition not initialized');
      return;
    }
    
    // Diagnostic probe (debug mode only)
    if (process.env.NEXT_PUBLIC_DEBUG === '1') {
      try {
        const { micEnvProbe } = await import('@/lib/diagnostics/micProbe');
        await micEnvProbe();
      } catch (e) {
        console.error('[Heijo][Diag] Mic probe failed:', e);
      }
    }
    
    if (!isInitialized || !isSupported) {
      console.log('Microphone not available or not initialized');
      onError?.('Microphone not available or not initialized');
      return;
    }

    if (isListening) {
      console.log('Stopping microphone listening');
      enhancedMicButtonRef.current.stopListening();
      setIsListening(false);
    } else {
      try {
        // Ensure language is up to date before starting
        enhancedMicButtonRef.current.setLanguage(selectedLanguage);
        
        // Request microphone permission if needed
        if (permissionState === 'prompt' || permissionState === 'unknown') {
          console.log('getUserMedia called');
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Mic permission granted');
            console.log('Audio stream started successfully');
            setPermissionState('granted');
          } catch (error) {
            console.log('Mic permission denied');
            console.error('Audio stream failed:', error);
            throw error;
          }
        }

        console.log(`Starting enhanced microphone listening with language: ${selectedLanguage}...`);
        await enhancedMicButtonRef.current.startListening(
          (text, isFinal) => {
            onTranscript(text, isFinal);
            if (isFinal) {
              // Update metrics after each final result
              setMetrics(enhancedMicButtonRef.current?.getMetrics() || null);
            }
          },
          (error) => {
            console.error('Voice recognition error:', error);
            setIsListening(false);
            
            // iOS Safari specific error handling
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            if (isIOS && isSafari && error.includes('no-speech')) {
              onError?.('Voice dictation may not be supported on iOS Safari.');
            } else {
              onError?.(error);
            }
          },
          () => {
            console.log('Voice recognition started');
            setIsListening(true);
          },
          () => {
            console.log('Voice recognition stopped');
            setIsListening(false);
            setMetrics(enhancedMicButtonRef.current?.getMetrics() || null);
          }
        );
        setPermissionState('granted');
      } catch (error) {
        console.error('Mic initialization failed:', error);
        // [Heijo Remediation 2025-01-06] Unified error messaging
        const errorMessage = getMicrophoneErrorMessage(error);
        onError?.(errorMessage);
        setPermissionState('denied');
      }
    }
  };

  // [Heijo Remediation 2025-01-06] Unified error messaging
  const getMicrophoneErrorMessage = (error: any) => {
    const errorName = error?.name || 'UnknownError';
    switch (errorName) {
      case 'NotAllowedError':
        return 'Permission denied — enable mic in browser.';
      case 'NotFoundError':
        return 'No input device detected.';
      case 'NotReadableError':
        return 'Mic already in use by another app.';
      case 'AbortError':
        return 'Microphone access was interrupted.';
      case 'SecurityError':
        return 'Microphone access blocked by security policy.';
      default:
        return `Microphone error: ${errorName}`;
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
    const baseClass = 'relative w-14 h-14 sm:w-16 sm:h-16 rounded-full mic-shell flex items-center justify-center transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-gray-900';
    
    switch (state) {
      case 'listening':
        return `${baseClass} recording text-[#fc7b3e]`;
      case 'denied':
        return `${baseClass} text-red-500 opacity-60 cursor-not-allowed`;
      case 'unsupported':
        return `${baseClass} text-text-caption opacity-60 cursor-not-allowed`;
      default:
        return `${baseClass} text-[#5a5a5a]`;
    }
  };

  const getTooltipText = () => {
    const state = getButtonState();
    switch (state) {
      case 'listening':
        return 'Stop recording';
      case 'denied':
        return 'Permission denied — enable mic in browser.';
      case 'unsupported':
        return 'Microphone not supported in this browser.';
      default:
        return 'Start voice recording';
    }
  };

  if (!isSupported) {
    return (
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full mic-shell text-text-caption opacity-60 flex items-center justify-center cursor-not-allowed">
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
        aria-pressed={isListening}
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
      
      {/* Tooltip - hidden on mobile to prevent off-screen issues */}
      <div className="hidden sm:block absolute bottom-full right-0 mb-2 px-2 py-1 bg-graphite-charcoal text-text-inverse text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10 max-w-xs">
        {getTooltipText()}
        <div className="absolute top-full right-4 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-graphite-charcoal"></div>
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

// Speech Recognition interfaces are defined in voiceToText.ts



