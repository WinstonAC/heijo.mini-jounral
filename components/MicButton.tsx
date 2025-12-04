'use client';

import { useState, useRef, useEffect } from 'react';
import { createEnhancedMicButton, VoiceMetrics, EnhancedMicButton } from '@/lib/voiceToText';
import { useVoiceSettings } from '@/lib/voiceSettings';
import { detectVoiceCapabilities, getRecommendedProvider, getVoiceSupportMessage } from '@/lib/browserCapabilities';

type MicState = 'idle' | 'initializing' | 'ready' | 'recording' | 'error';

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
  const { selectedLanguage, provider: userProvider, setProvider } = useVoiceSettings();
  const [micState, setMicState] = useState<MicState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [metrics, setMetrics] = useState<VoiceMetrics | null>(null);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [effectiveProvider, setEffectiveProvider] = useState<'webspeech' | 'whisper' | 'google'>('webspeech');
  const micRef = useRef<HTMLButtonElement>(null);
  const enhancedMicButtonRef = useRef<EnhancedMicButton | null>(null);
  const capabilitiesRef = useRef<ReturnType<typeof detectVoiceCapabilities> | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false); // Guard to prevent double-toggling during start
  const onErrorRef = useRef<MicButtonProps['onError']>();
  const hasAutoSwitchedProviderRef = useRef(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    const initializeMic = async () => {
      // Prevent concurrent initialization
      if (isInitializingRef.current) {
        return;
      }

      isInitializingRef.current = true;
      setMicState(prev => (prev === 'recording' ? prev : 'initializing'));

      try {
        // Detect browser capabilities
        const capabilities = detectVoiceCapabilities();
        capabilitiesRef.current = capabilities;

        // Check basic requirements
        if (!capabilities.hasMediaDevices) {
          console.log('Microphone not supported in this browser');
          if (cancelled) return;
          setIsSupported(false);
          setMicState('error');
          onErrorRef.current?.('Voice input is not supported on this device.');
          return;
        }

        // Check secure context (with localhost exception)
        const allowInsecureLocalhost = 
          !capabilities.isSecure && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        if (!capabilities.isSecure && !allowInsecureLocalhost) {
          console.log('Microphone requires HTTPS context');
          if (cancelled) return;
          setIsSupported(false);
          setMicState('error');
          onErrorRef.current?.('Voice input requires a secure connection (HTTPS).');
          return;
        }

        // Determine effective provider based on capabilities
        const recommendedProvider = getRecommendedProvider(capabilities);
        let effectiveProv: 'webspeech' | 'whisper' | 'google' = 'webspeech';

        if (recommendedProvider === 'unsupported') {
          if (cancelled) return;
          setIsSupported(false);
          setMicState('error');
          const supportMessage = getVoiceSupportMessage(capabilities);
          onErrorRef.current?.(supportMessage || 'Voice input is not supported on this device.');
          return;
        } else if (recommendedProvider === 'backend') {
          // Auto-select backend provider (prefer whisper, fallback to google)
          effectiveProv = userProvider === 'google' ? 'google' : 'whisper';
          // Update context if needed - but only once to avoid loops
          if (userProvider === 'webspeech' && !hasAutoSwitchedProviderRef.current) {
            setProvider('whisper');
            hasAutoSwitchedProviderRef.current = true;
          }
        } else {
          // WebSpeech is available
          effectiveProv = userProvider === 'webspeech' ? 'webspeech' : 'whisper';
          // Reset flag when WebSpeech is available
          hasAutoSwitchedProviderRef.current = false;
        }

        if (cancelled) return;
        setEffectiveProvider(effectiveProv);

        // Log provider selection for debugging (desktop focus)
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === '1') {
          const uaSnippet = typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'SSR';
          console.log(`[Heijo][Voice] Provider selected: ${effectiveProv}, requiresBackend: ${capabilities.requiresBackend}, userAgent: ${uaSnippet}`);
        }

        // Show info message if backend is required
        const supportMessage = getVoiceSupportMessage(capabilities);
        if (supportMessage && recommendedProvider === 'backend') {
          console.log('[Heijo][Mic]', supportMessage);
        }

        // Check permissions
        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setPermissionState(permission.state);
            
            if (permission.state === 'denied') {
              console.warn('[Heijo][Mic] Microphone access blocked — check browser settings');
            }
            
            permission.onchange = () => {
              setPermissionState(permission.state);
            };
          } catch (error) {
            console.warn('[Heijo][Mic] Permission API not supported, continuing:', error);
          }
        }

        // Reuse existing instance when possible to avoid repeated init/log spam
        const existing = enhancedMicButtonRef.current;
        if (existing && existing.getProvider() === effectiveProv) {
          existing.setLanguage(selectedLanguage);
          
          // FIXED: Don't call initialize() if instance already exists
          // The instance is either already initialized or initializing
          // Calling initialize() again causes "Already initializing, skipping" spam
          // Just update language and mark mic as ready (instance will complete init on its own)
          setIsSupported(true);
          setMicState(prev => {
            // If we're recording, keep recording
            if (prev === 'recording') return prev;
            // Otherwise, set to ready (instance exists, so it's either ready or will be soon)
            return 'ready';
          });
          return;
        }

        // Clean up old instance if provider changed
        if (existing) {
          if (existing.isActive()) {
            existing.stopListening();
          }
          existing.destroy();
        }

        // Initialize enhanced mic button
        console.log(`Initializing enhanced microphone with language: ${selectedLanguage}, provider: ${effectiveProv}...`);
        const micButton = createEnhancedMicButton(selectedLanguage, effectiveProv);
        enhancedMicButtonRef.current = micButton;
        
        const initialized = await micButton.initialize();
        console.log('Enhanced microphone initialization result:', initialized);
        
        if (cancelled) return;

        if (initialized) {
          setIsSupported(true);
          setMicState('ready');
        } else {
          // Full reset on initialization failure - clear ref so next click can retry cleanly
          if (enhancedMicButtonRef.current) {
            try {
              enhancedMicButtonRef.current.destroy();
            } catch (destroyError) {
              // Ignore destroy errors
            }
            enhancedMicButtonRef.current = null;
          }
          setIsSupported(false);
          setMicState('error');
          onErrorRef.current?.('Failed to initialize voice recognition.');
        }
      } catch (error) {
        console.error('Failed to initialize microphone:', error);
        if (cancelled) return;
        // Full reset on initialization failure - clear ref so next click can retry cleanly
        if (enhancedMicButtonRef.current) {
          try {
            enhancedMicButtonRef.current.destroy();
          } catch (destroyError) {
            // Ignore destroy errors
          }
          enhancedMicButtonRef.current = null;
        }
        setIsSupported(false);
        setMicState('error');
        const errorMessage = error instanceof Error ? error.message : 'Voice input is not supported on this device.';
        onErrorRef.current?.(errorMessage);
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeMic();

    return () => {
      isInitializingRef.current = false;
      cancelled = true;
    };
  }, [selectedLanguage, userProvider]); // eslint-disable-line react-hooks/exhaustive-deps
  // setProvider is intentionally excluded - it's memoized and causes infinite loops if included

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isInitializingRef.current = false;
      if (enhancedMicButtonRef.current) {
        enhancedMicButtonRef.current.destroy();
        enhancedMicButtonRef.current = null;
      }
    };
  }, []);

  const toggleListening = async () => {
    console.log('[Heijo][Voice] MicButton click', { 
      isListening, 
      micState,
      engineReady: enhancedMicButtonRef.current?.isActive() || false,
      isInitializing: isInitializingRef.current,
      isSupported,
      enhancedMicButtonRef: !!enhancedMicButtonRef.current
    });
    
    // Check for initializing state FIRST (before error retry)
    // But only if we're not in error state (error state will retry below)
    if (micState === 'initializing' && micState !== 'error') {
      console.log('Mic button pressed but state is initializing');
      onError?.('Voice recognition is still initializing. Please wait.');
      return;
    }
    
    // If in error state, try to re-initialize
    let recoveredFromError = false;
    if (micState === 'error') {
      console.log('[Heijo][Voice] MicButton: Attempting to re-initialize from error state');
      isInitializingRef.current = false; // Reset guard to allow retry
      // FIXED: Keep state as 'error' during recovery so button stays clickable
      // Don't set to 'initializing' yet
      
      try {
        if (!enhancedMicButtonRef.current) {
          // Need to create new instance
          const capabilities = detectVoiceCapabilities();
          const recommendedProvider = getRecommendedProvider(capabilities);
          let effectiveProv: 'webspeech' | 'whisper' | 'google' = 'webspeech';
          
          if (recommendedProvider === 'backend') {
            effectiveProv = userProvider === 'google' ? 'google' : 'whisper';
          } else {
            effectiveProv = userProvider === 'webspeech' ? 'webspeech' : 'whisper';
          }
          
          const micButton = createEnhancedMicButton(selectedLanguage, effectiveProv);
          enhancedMicButtonRef.current = micButton;
        }
        
        const initialized = await enhancedMicButtonRef.current.initialize();
        if (initialized) {
          setIsSupported(true);
          setMicState('ready');
          recoveredFromError = true;
          // Continue to start listening below - DON'T return here
        } else {
          // Full reset on initialization failure - clear ref so next click can retry cleanly
          if (enhancedMicButtonRef.current) {
            try {
              enhancedMicButtonRef.current.destroy();
            } catch (destroyError) {
              // Ignore destroy errors
            }
            enhancedMicButtonRef.current = null;
          }
          setIsSupported(false);
          setMicState('error');
          onError?.('Failed to initialize voice recognition. Please try again.');
          return;
        }
      } catch (error) {
        console.error('[Heijo][Voice] MicButton: Re-initialization failed', error);
        // Full reset on initialization failure - clear ref so next click can retry cleanly
        if (enhancedMicButtonRef.current) {
          try {
            enhancedMicButtonRef.current.destroy();
          } catch (destroyError) {
            // Ignore destroy errors
          }
          enhancedMicButtonRef.current = null;
        }
        setIsSupported(false);
        setMicState('error');
        onError?.('Failed to initialize voice recognition. Please try again.');
        return;
      }
    }
    
    // Now check if ready (after potential error recovery)
    if (micState !== 'ready' && micState !== 'recording' && !recoveredFromError) {
      console.log('Mic button pressed but state is:', micState);
      onError?.('Voice recognition is not available.');
      return;
    }
    
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

    // Guard: Prevent double-toggling during start sequence
    if (isStartingRef.current) {
      console.log('[Heijo][Mic] Start already in progress, ignoring toggle');
      return;
    }

    // Only allow stop if we are truly listening (not just in recording state from a previous attempt)
    if (isListening || (micState === 'recording' && enhancedMicButtonRef.current?.isActive())) {
      console.log('Stopping microphone listening');
      enhancedMicButtonRef.current.stopListening();
      setIsListening(false);
      setMicState('ready');
      isStartingRef.current = false; // Reset guard
    } else {
      try {
        isStartingRef.current = true; // Set guard to prevent double-toggling
        setMicState('recording');
        
        // Ensure language is up to date before starting
        enhancedMicButtonRef.current.setLanguage(selectedLanguage);
        
        // Request microphone permission if needed
        if (permissionState === 'prompt' || permissionState === 'unknown') {
          console.log('Requesting microphone permission...');
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Mic permission granted');
            stream.getTracks().forEach(track => track.stop()); // Stop immediately, we'll get it again in startListening
            setPermissionState('granted');
          } catch (error) {
            console.log('Mic permission denied');
            console.error('Audio stream failed:', error);
            setMicState('ready');
            isStartingRef.current = false; // Reset guard on error
            throw error;
          }
        }

        console.log(`Starting enhanced microphone listening with language: ${selectedLanguage}, provider: ${effectiveProvider}...`);
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
            setMicState('ready');
            isStartingRef.current = false; // Reset guard on error
            onError?.(error);
          },
          () => {
            console.log('Voice recognition started');
            setIsListening(true);
            setMicState('recording');
            isStartingRef.current = false; // Reset guard when start callback fires successfully
          },
          () => {
            console.log('Voice recognition stopped');
            setIsListening(false);
            setMicState('ready');
            isStartingRef.current = false; // Reset guard when stopped
            setMetrics(enhancedMicButtonRef.current?.getMetrics() || null);
          }
        );
        setPermissionState('granted');
      } catch (error) {
        console.error('Mic start failed:', error);
        const errorMessage = getMicrophoneErrorMessage(error);
        onError?.(errorMessage);
        setPermissionState('denied');
        setMicState('ready'); // Return to ready state, allow retry
        isStartingRef.current = false; // Reset guard on error
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
    if (!isSupported || micState === 'error') return 'unsupported';
    if (permissionState === 'denied') return 'denied';
    if (micState === 'initializing') return 'initializing';
    if (isListening || micState === 'recording') return 'listening';
    if (micState === 'ready') return 'ready';
    return 'unsupported';
  };

  const getButtonClass = () => {
    const state = getButtonState();
    const baseClass = 'relative w-14 h-14 sm:w-16 sm:h-16 rounded-full mic-shell flex items-center justify-center transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-gray-900';
    
    switch (state) {
      case 'listening':
        return `${baseClass} recording text-[#fc7b3e]`;
      case 'initializing':
        return `${baseClass} text-text-caption opacity-60 cursor-wait animate-pulse`;
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
      case 'initializing':
        return 'Initializing voice recognition...';
      case 'denied':
        return 'Permission denied — enable mic in browser.';
      case 'unsupported':
        return 'Microphone not supported in this browser.';
      default:
        return 'Start voice recording';
    }
  };

  // Only show unsupported icon if truly unsupported (not just error state)
  // Error state should show the button so user can retry
  if (!isSupported && micState !== 'error') {
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
        disabled={(micState !== 'ready' && micState !== 'recording' && micState !== 'error') || permissionState === 'denied'}
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
