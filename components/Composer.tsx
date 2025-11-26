'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MicButton from './MicButton';
import TagPicker from './TagPicker';
import HeaderClock from './HeaderClock';
import VibesPillButton from './VibesPillButton';
import { JournalEntry } from '@/lib/store';
import { getPrompt, logPromptHistory } from '@/lib/pickPrompt';
import { analyticsCollector } from '@/lib/analytics';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

interface ComposerProps {
  onSave: (entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'> & { sync_status?: 'local_only' | 'synced' }) => Promise<JournalEntry>;
  onExport: () => void;
  selectedPrompt?: { id: string; text: string } | null;
  userId?: string;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  entryCount?: number; // Number of entries for this user
  onManualSaveReady?: (saveFn: () => Promise<void>) => void; // Optional callback to expose save function
}

export default function Composer({ onSave, onExport, selectedPrompt, userId, fontSize, setFontSize, entryCount = 0, onManualSaveReady }: ComposerProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [source, setSource] = useState<'text' | 'voice'>('text');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voicePauseTimer, setVoicePauseTimer] = useState<NodeJS.Timeout | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [promptState, setPromptState] = useState<'ticking' | 'showing' | 'selected' | 'hidden'>('ticking');
  const [currentPrompt, setCurrentPrompt] = useState<{ id: string; text: string } | null>(null);
  const [hasShownToday, setHasShownToday] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileMicButtonRef = useRef<HTMLButtonElement | null>(null);
  const micButtonInternalRef = useRef<HTMLButtonElement | null>(null);
  const handleManualSaveRef = useRef<() => Promise<void>>();
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [showSaveGlow, setShowSaveGlow] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // Default to true, will check localStorage
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);
  const lastSaveAttemptRef = useRef<number>(0);
  const SAVE_DEBOUNCE_MS = 2000; // Minimum 2 seconds between save attempts
  
  // Mobile detection hook
  const isMobile = useIsMobile();
  
  // Feature flag to disable FAB
  const ENABLE_FAB = false;

  // Check if user has seen welcome (account-based, Supabase-first)
  // Show onboarding if has_seen_onboarding is false AND heijo_hasSeenWelcome is not 'true'
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkOnboardingStatus = async () => {
      
      // First, check Supabase user metadata (account-based)
      if (supabase && isSupabaseConfigured() && userId) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (!error && user) {
            const hasSeenOnboarding = user.user_metadata?.has_seen_onboarding === true;
            
            if (hasSeenOnboarding) {
              // User has completed onboarding - don't show overlay
              setHasSeenWelcome(true);
              setShowWelcomeOverlay(false);
              
              // Sync localStorage for fast future checks
              try {
                localStorage.setItem('heijo_hasSeenWelcome', 'true');
              } catch (e) {
                // localStorage may be blocked, that's okay
              }
              
              if (process.env.NODE_ENV === 'development') {
                console.log('Onboarding state: using Supabase metadata (completed)');
              }
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to check Supabase onboarding status:', error);
          // Fall through to localStorage check
        }
      }
      
      // Fallback to localStorage check (for speed + pre-existing data)
      const hasSeenLocal = localStorage.getItem('heijo_hasSeenWelcome');
      
      if (hasSeenLocal === 'true') {
        // LocalStorage says onboarding is done
        setHasSeenWelcome(true);
        setShowWelcomeOverlay(false);
        
        // Queue update to Supabase if user exists
        if (supabase && isSupabaseConfigured() && userId) {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && user.user_metadata?.has_seen_onboarding !== true && supabase) {
              supabase.auth.updateUser({
                data: { has_seen_onboarding: true }
              }).catch(err => console.warn('Failed to sync onboarding to Supabase:', err));
            }
          });
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Onboarding state: using localStorage fallback (completed)');
        }
      } else {
        // Show welcome for new users (has_seen_onboarding is false AND heijo_hasSeenWelcome is not 'true')
        setHasSeenWelcome(false);
        setShowWelcomeOverlay(true);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Onboarding state: showing welcome (first-time user)');
        }
      }
    };
    
    checkOnboardingStatus();
  }, [userId]);

  // Delay prompt logic until welcome overlay is dismissed
  useEffect(() => {
    // Only check for prompts if welcome has been seen
    if (!hasSeenWelcome || showWelcomeOverlay) return;
    
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('heijo-prompt-shown');
    if (lastShown === today) {
      setHasShownToday(true);
      setPromptState('hidden');
    } else {
      // Show prompt question on load if not shown today
      setPromptState('ticking');
    }
  }, [hasSeenWelcome, showWelcomeOverlay]);

  // Prevent body scroll when prompt sheet is open on mobile
  useEffect(() => {
    const isPromptOpen = (promptState === 'ticking' && !hasShownToday) || promptState === 'showing';
    
    if (isPromptOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      if (process.env.NODE_ENV === 'development') {
        console.log('[Mobile UX] Prompt sheet opened - body scroll locked');
      }
    } else {
      document.body.style.overflow = '';
      if (isPromptOpen && process.env.NODE_ENV === 'development') {
        console.log('[Mobile UX] Prompt sheet closed - body scroll restored');
      }
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [promptState, hasShownToday, isMobile]);

  // Reset prompt for testing - remove this in production
  useEffect(() => {
    // Uncomment the line below to reset prompts for testing
    // localStorage.removeItem('heijo-prompt-shown');
  }, []);

  // Debug logging for mobile UX
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (showWelcomeOverlay) {
        console.log('[Mobile UX] Welcome overlay shown');
      }
      if (promptState === 'ticking' && !hasShownToday) {
        console.log('[Mobile UX] Prompt sheet opened');
      }
      if (promptState === 'hidden') {
        console.log('[Mobile UX] Prompt sheet closed');
      }
    }
  }, [showWelcomeOverlay, promptState, hasShownToday]);


  // Handle welcome overlay dismissal
  const handleDismissWelcome = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Update localStorage (wrapped in try/catch for safety)
      try {
        localStorage.setItem('heijo_hasSeenWelcome', 'true');
      } catch (error) {
        console.warn('Failed to update localStorage:', error);
        // Continue even if localStorage fails
      }
      
      // Update Supabase user metadata (account-based)
      if (supabase && isSupabaseConfigured() && userId) {
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (!error && user && supabase) {
            supabase.auth.updateUser({
              data: { has_seen_onboarding: true }
            }).catch(err => console.error('Error updating user metadata:', err));
          }
        });
      }
      
      // Track analytics
      analyticsCollector.trackEvent('onboarding_completed', {
        timestamp: new Date().toISOString(),
        userId: userId,
      });
    }
    
    // Update local state
    setShowWelcomeOverlay(false);
    setHasSeenWelcome(true);
  }, [userId]);

  // Handle clicking into textarea or typing - dismiss welcome
  const handleTextareaFocus = useCallback(() => {
    if (showWelcomeOverlay) {
      handleDismissWelcome();
    }
  }, [showWelcomeOverlay, handleDismissWelcome]);

  // Handle typing - dismiss welcome if user starts typing
  useEffect(() => {
    if (showWelcomeOverlay && content.trim().length > 0) {
      handleDismissWelcome();
    }
  }, [content, showWelcomeOverlay, handleDismissWelcome]);

  const handleAutoSave = useCallback(async () => {
    if (!content.trim()) return;
    
    // Prevent rapid saves - debounce
    const now = Date.now();
    if (now - lastSaveAttemptRef.current < SAVE_DEBOUNCE_MS) {
      return;
    }
    
    // Don't attempt save if rate limited
    if (isRateLimited) {
      return;
    }

    setIsAutoSaving(true);
    lastSaveAttemptRef.current = now;
    
    try {
      const savedEntry = await onSave({
        content: content.trim(),
        source,
        tags: selectedTags,
        created_at: new Date().toISOString(),
        user_id: userId, // Let storage handle undefined - it will get real userId
        sync_status: 'local_only'
      });
      setLastSaved(new Date());
      setIsRateLimited(false);
      setRateLimitRetryAfter(null);
    } catch (error) {
      console.error('Auto-save failed:', error);
      
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('Rate limit')) {
        setIsRateLimited(true);
        // Extract retry after if available
        const retryMatch = error.message.match(/try again later/i);
        if (retryMatch) {
          // Default to 60 seconds if we can't parse the exact time
          setRateLimitRetryAfter(60);
        }
        // Clear auto-save timeout to prevent further attempts
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        return; // Don't log as regular error
      }
      
      // Check if this was a voice transcription that failed to save
      if (source === 'voice') {
        console.warn('Mic transcription ready, but Supabase save failed:', error);
      }
    } finally {
      setIsAutoSaving(false);
    }
  }, [content, source, selectedTags, userId, onSave, isRateLimited]);

  // Auto-save functionality (5-10 seconds)
  useEffect(() => {
    // Don't set up auto-save if rate limited
    if (isRateLimited) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      return;
    }
    
    if (content.trim() && content.length > 10 && !isAutoSaving) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (7 seconds)
      autoSaveTimeoutRef.current = setTimeout(() => {
        // Double-check we're not already saving and not rate limited before executing
        if (!isAutoSaving && !isRateLimited) {
          handleAutoSave();
        }
      }, 7000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, handleAutoSave, isAutoSaving, isRateLimited]);

  // Keyboard shortcuts for save functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + S or Cmd/Ctrl + Enter
      if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'Enter')) {
        event.preventDefault(); // Prevent browser save dialog
        
        if (content.trim() && !isRateLimited) {
          console.info('Save triggered via keyboard shortcut');
          // Trigger silver glow animation
          setShowSaveGlow(true);
          setTimeout(() => setShowSaveGlow(false), 1000);
          // Use handleManualSave to respect rate limits and debouncing
          handleManualSave();
        } else if (isRateLimited) {
          console.warn('Save blocked: Rate limit exceeded');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, selectedTags, source, userId, onSave, isRateLimited, handleManualSave]);

  const handleVoiceTranscript = (transcript: string, isFinal?: boolean) => {
    if (isFinal) {
      console.log('Mic transcription complete, ready for saving');
      
      // Track analytics for voice recording
      analyticsCollector.trackEvent('voice_recording_start');
      analyticsCollector.trackEvent('voice_to_text_used');
      // Final transcript - add to content with smooth transitions
      setContent(prev => {
        let newContent = prev + (prev ? ' ' : '') + transcript;
        
        // Add line break on sentence endings
        if (/[.!?]\s*$/.test(transcript)) {
          newContent += '\n\n';
        }
        
        setSource('voice');
        return newContent;
      });
      setInterimTranscript('');
      setIsVoiceActive(true);

      // Clear existing pause timer
      if (voicePauseTimer) {
        clearTimeout(voicePauseTimer);
      }

      // Set new pause timer - longer pause for new paragraphs
      const timer = setTimeout(() => {
        setContent(prev => {
          if (!prev.endsWith('\n\n')) {
            return prev + '\n\n';
          }
          return prev;
        });
        setIsVoiceActive(false);
      }, 800); // 800ms pause as specified

      setVoicePauseTimer(timer);
      
      // Auto-scroll to bottom if user hasn't manually scrolled
      setTimeout(() => {
        if (textareaRef.current && !isUserScrolled) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      }, 100);
    } else {
      // Interim transcript - show live updates with gentle fade
      setInterimTranscript(transcript);
      setSource('voice');
    }
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
    setIsVoiceActive(false);
    setInterimTranscript('');
    
    // Clear error after 5 seconds
    setTimeout(() => setVoiceError(null), 5000);
  };

  const handleManualSave = useCallback(async () => {
    if (!content.trim()) return;
    
    // Prevent rapid saves - debounce
    const now = Date.now();
    if (now - lastSaveAttemptRef.current < SAVE_DEBOUNCE_MS) {
      return;
    }
    
    // Don't attempt save if rate limited
    if (isRateLimited) {
      console.warn('Save blocked: Rate limit exceeded');
      return;
    }

    lastSaveAttemptRef.current = now;
    setIsAutoSaving(true);

    try {
      await onSave({
        content: content.trim(),
        source,
        tags: selectedTags,
        created_at: new Date().toISOString(),
        user_id: userId, // Let storage handle undefined - it will get real userId
        sync_status: 'local_only'
      });

      // Show toast confirmation
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Reset form
      setContent('');
      setSelectedTags([]);
      setSource('text');
      setLastSaved(new Date());
      setIsRateLimited(false);
      setRateLimitRetryAfter(null);
    } catch (error) {
      console.error('Manual save failed:', error);
      
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('Rate limit')) {
        setIsRateLimited(true);
        // Extract retry after if available
        const retryMatch = error.message.match(/try again later/i);
        if (retryMatch) {
          // Default to 60 seconds if we can't parse the exact time
          setRateLimitRetryAfter(60);
        }
        // Show error toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return; // Don't log as regular error
      }
      
      // Check if this was a voice transcription that failed to save
      if (source === 'voice') {
        console.warn('Mic transcription ready, but Supabase save failed:', error);
      }
    } finally {
      setIsAutoSaving(false);
    }
  }, [content, source, selectedTags, userId, onSave, isRateLimited]);

  // Store latest handleManualSave in ref (update ref directly, no useEffect to avoid loops)
  handleManualSaveRef.current = handleManualSave;

  // Expose manual save function to parent for mobile bottom nav
  // Use useCallback to create a stable reference
  const stableSaveFn = useCallback(async () => {
    if (handleManualSaveRef.current) {
      await handleManualSaveRef.current();
    }
  }, []); // Empty deps - function always calls latest ref value

  useEffect(() => {
    if (onManualSaveReady) {
      onManualSaveReady(stableSaveFn);
    }
  }, [onManualSaveReady, stableSaveFn]);

  // Set up ref to MicButton's internal button for mobile
  useEffect(() => {
    const updateMicButtonRef = () => {
      const wrapper = document.querySelector('[data-mobile-mic-wrapper]');
      if (wrapper) {
        const button = wrapper.querySelector('button') as HTMLButtonElement;
        if (button) {
          micButtonInternalRef.current = button;
        }
      }
    };
    
    // Try immediately
    updateMicButtonRef();
    
    // Also try after a short delay to ensure MicButton has rendered
    const timeout = setTimeout(updateMicButtonRef, 100);
    
    return () => clearTimeout(timeout);
  }, [isMobile, showWelcomeOverlay, promptState]);

  // Listen for mobile save event from bottom nav (fallback)
  useEffect(() => {
    const handleMobileSave = () => {
      if (handleManualSaveRef.current) {
        handleManualSaveRef.current();
      }
    };
    window.addEventListener('mobileSave', handleMobileSave);
    return () => window.removeEventListener('mobileSave', handleMobileSave);
  }, []); // Empty deps - use ref to get latest function

  // Periodically check if rate limit has been cleared
  useEffect(() => {
    if (!isRateLimited) return;

    const checkRateLimit = async () => {
      try {
        // Import rate limiter dynamically to avoid circular dependencies
        const { rateLimiter } = await import('@/lib/rateLimiter');
        const check = await rateLimiter.isAllowed();
        if (check.allowed) {
          setIsRateLimited(false);
          setRateLimitRetryAfter(null);
        } else if (check.retryAfter) {
          setRateLimitRetryAfter(check.retryAfter);
        }
      } catch (error) {
        console.warn('Failed to check rate limit status:', error);
      }
    };

    // Check immediately
    checkRateLimit();

    // Then check every 5 seconds while rate limited
    const interval = setInterval(checkRateLimit, 5000);

    return () => clearInterval(interval);
  }, [isRateLimited]);

  const handleExport = () => {
    onExport();
  };

  const handleExportCurrentEntry = () => {
    if (!content.trim()) {
      console.warn("No entry to export");
      return;
    }

    try {
      // Import CSV export function
      import('@/lib/csvExport').then(({ exportEntriesAsCSV }) => {
        // Create a single entry object with current content
        const currentEntry = {
          id: crypto.randomUUID(),
          content: content.trim(),
          tags: selectedTags,
          source,
          created_at: new Date().toISOString(),
          user_id: userId || 'anonymous',
          sync_status: 'local_only' as const,
          last_synced: undefined
        };

        // Export as CSV
        exportEntriesAsCSV([currentEntry]);
        console.info('Current entry exported as CSV');
      });
    } catch (error) {
      console.error('Failed to export current entry:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setContent(prev => prev + '\n\n');
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-sm'; // 14px / 500 weight
      case 'medium': return 'text-base'; // 15px / 400 weight
      case 'large': return 'text-lg'; // 16px / 400 weight
      default: return 'text-base';
    }
  };

  // Prompt handlers
  const handlePromptYes = () => {
    if (userId) {
      // Get the actual daily prompt
      const todayISO = new Date().toISOString().split('T')[0];
      const promptData = getPrompt(userId, todayISO);
      setCurrentPrompt(promptData);
      setPromptState('showing');
    }
  };

  const handlePromptNo = () => {
    setPromptState('hidden');
    // Mark as shown today even if declined
    const today = new Date().toDateString();
    localStorage.setItem('heijo-prompt-shown', today);
  };

  const handleSelectPrompt = () => {
    if (currentPrompt && userId) {
      logPromptHistory(userId, currentPrompt.id);
      setPromptState('selected');
      
      // Mark as shown today
      const today = new Date().toDateString();
      localStorage.setItem('heijo-prompt-shown', today);
    }
  };


  return (
    <div className="h-full flex flex-col space-y-2 sm:space-y-4">
      {/* Digital-style Date/Time Display */}
      <div className="flex-shrink-0">
        <HeaderClock />
      </div>

      {/* Prompt Question - Full-screen sheet on mobile */}
      {promptState === 'ticking' && !hasShownToday && !showWelcomeOverlay && (
        <div className="fixed inset-0 bg-graphite-charcoal bg-opacity-60 md:bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="prompt-bubble rounded-xl p-6 sm:p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <p className="text-graphite-charcoal font-medium text-lg sm:text-xl mb-6 sm:mb-8 leading-relaxed subheading">
                Would you like a prompt today?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4">
                <button
                  onClick={handlePromptYes}
                  className="px-6 py-3 text-sm font-medium silver-button text-graphite-charcoal rounded-lg transition-all duration-300 min-h-[44px]"
                >
                  Yes
                </button>
                <button
                  onClick={handlePromptNo}
                  className="px-6 py-3 text-sm font-medium outline-button rounded-lg transition-all duration-300 min-h-[44px]"
                >
                  No
                </button>
              </div>
              <button
                onClick={handlePromptNo}
                className="text-xs text-text-caption hover:text-graphite-charcoal transition-colors duration-200 caption-text min-h-[44px] px-2"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Display - Minimal floating card */}
      {promptState === 'showing' && currentPrompt && (
        <div className="flex-shrink-0 prompt-bubble rounded-xl px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-graphite-charcoal font-medium text-base flex-1 sm:pr-6 leading-relaxed body-text">
              {currentPrompt.text}
            </p>
            <div className="flex flex-wrap items-center gap-2 justify-end sm:justify-start">
              <button
                onClick={handleSelectPrompt}
                className="px-4 py-2 text-sm font-medium silver-button text-graphite-charcoal rounded-lg transition-all duration-300 min-w-[96px]"
              >
                Use This
              </button>
              <button
                onClick={handlePromptNo}
                className="px-4 py-2 text-sm font-medium outline-button rounded-lg transition-all duration-300 min-w-[96px]"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Prompt Display - Minimal floating card */}
      {promptState === 'selected' && currentPrompt && (
        <div className="flex-shrink-0 prompt-bubble border-soft-silver rounded-xl px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-graphite-charcoal font-medium text-base leading-relaxed body-text">
              {currentPrompt.text}
            </p>
            <div className="text-xs text-text-caption font-medium px-3 py-1 bg-tactile-taupe rounded-full caption-text">
              SELECTED
            </div>
          </div>
        </div>
      )}

      {/* Legacy Selected Prompt Display */}
      {selectedPrompt && (
        <div className="flex-shrink-0 bg-[#2A5A2A] border border-[#B8D8B8] rounded-lg p-3 shadow-[0_0_15px_rgba(184,184,184,0.1)]">
          <div className="flex items-center justify-between">
            <p className="text-[#E8E8E8] font-medium text-sm" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
              {selectedPrompt.text}
            </p>
            <div className="text-xs text-[#4A7A4A] font-medium" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
              PROMPT
            </div>
          </div>
        </div>
      )}

      {/* Journal entry section - Full width dominant */}
      <div className="flex-1 flex flex-col min-h-0 pb-20 sm:pb-0">
        {/* Graphite charcoal typing area with silver focus */}
        <div className="relative flex-1">
          {/* DESKTOP MIC – positioned absolutely in top-right */}
          <div className="hidden md:block absolute md:right-6 md:top-4 z-10">
            <div className="relative">
              <MicButton 
                onTranscript={handleVoiceTranscript} 
                onError={handleVoiceError}
              />
              {isVoiceActive && (
                <div className="pointer-events-none absolute inset-[-6px] rounded-full border border-orange-400/60"></div>
              )}
            </div>
          </div>
          <div className="relative w-full h-full">
            {/* Mobile Vibes Pill - bottom-left inside black card */}
            {isMobile && !showWelcomeOverlay && (
              <VibesPillButton 
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            )}
            {showWelcomeOverlay ? (
              // Welcome message displayed inside the textarea area
              <div 
                className="w-full rounded-[14px] border border-white/10 journal-input p-6 sm:p-8 flex flex-col justify-center"
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  background: '#171717',
                  color: 'var(--text-inverse)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28), 0 6px 20px rgba(0,0,0,0.2)',
                  ...(promptState === "hidden"
                    ? (
                        isMobile
                          ? {
                              height: "calc(100dvh - 14rem)",
                              transition: "height 0.3s ease",
                            }
                          : {
                              height: "clamp(360px, calc(100dvh - 21rem), 520px)",
                              transition: "height 0.3s ease",
                            }
                      )
                    : {
                        minHeight: "200px",
                      })
                }}
              >
                <div className="space-y-6 body-text" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-inverse)' }}>
                  <div className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-semibold leading-tight">
                      Welcome to Heijō mini-journal.
                    </h2>
                    <p className="text-base sm:text-lg leading-relaxed opacity-90">
                      Micro-moments. Macro-clarity.
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-sm sm:text-base leading-relaxed opacity-90">
                    <p>1. Type or {isMobile ? 'tap' : 'click'} the mic to speak your thoughts.</p>
                    <p>2. Use Save (or the S button on desktop) to store your entry.</p>
                  </div>
                  
                  <p className="text-xs sm:text-sm opacity-75 italic">
                    You&apos;ll only see this message once. When you&apos;re ready, clear this and write your first entry.
                  </p>
                  
                  <button
                    onClick={handleDismissWelcome}
                    onFocus={handleTextareaFocus}
                    className="mt-4 px-6 py-3 text-sm sm:text-base font-medium silver-button text-graphite-charcoal rounded-lg transition-all duration-300 hover:bg-tactile-taupe self-start"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Start journaling
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content + (interimTranscript ? ` ${interimTranscript}` : '')}
                onChange={(e) => {
                  setContent(e.target.value);
                  setSource('text');
                  setInterimTranscript(''); // Clear interim when typing
                }}
                onFocus={handleTextareaFocus}
                onKeyDown={handleKeyDown}
                onScroll={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 5;
                  setIsUserScrolled(!isAtBottom);
                }}
                placeholder="Type or speak your thoughts..."
                className={`w-full resize-none rounded-[14px] border border-white/10 bg-transparent focus:outline-none text-gray-100 p-3 sm:p-4 lg:p-5 journal-input transition-all duration-300 ${getFontSizeClass()} ${
                  promptState === "hidden"
                    ? (isMobile ? "overflow-y-auto" : "flex-1 h-full min-h-0") // Scrollable on mobile, fill on desktop
                    : "min-h-[160px] sm:min-h-[200px] overflow-y-auto" // Standard height with scroll
                }`}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  lineHeight: '1.6',
                  background: '#171717',
                  color: 'var(--text-inverse)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28), 0 6px 20px rgba(0,0,0,0.2)',
                  ...(promptState === "hidden"
                    ? (
                        isMobile
                          ? {
                              // ✅ MOBILE: taller textarea for better mobile experience
                              minHeight: "45vh",
                              maxHeight: "55vh",
                              height: "auto",
                              transition: "height 0.3s ease",
                            }
                          : {
                              // ✅ DESKTOP: reduced height by ~15-20% for better balance
                              height: "clamp(300px, calc((100dvh - 21rem) * 0.85), 440px)",
                              transition: "height 0.3s ease",
                            }
                      )
                    : {
                        minHeight: isMobile ? "45vh" : "160px",
                        maxHeight: isMobile ? "55vh" : "250px",
                      })
                }}
              />
            )}
            
            {/* Jump to live button */}
            {isUserScrolled && isVoiceActive && (
              <div className="absolute bottom-4 left-4 bg-graphite-charcoal text-text-inverse text-sm px-4 py-2 rounded-lg cursor-pointer hover:bg-soft-silver hover:text-graphite-charcoal transition-all duration-300 animate-fade-in shadow-lg"
                   onClick={() => {
                     if (textareaRef.current) {
                       textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                       setIsUserScrolled(false);
                     }
                   }}>
                Jump to live
              </div>
            )}
            
            {/* Live transcript indicator */}
            {interimTranscript && (
              <div className="absolute bottom-4 right-4 bg-graphite-charcoal text-text-inverse text-sm px-4 py-2 rounded-lg opacity-90 animate-fade-in shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-soft-silver rounded-full animate-pulse"></div>
                  <span>Listening...</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Circular Silver Save Button - Positioned to avoid S/E/H overlap */}
        {ENABLE_FAB && (
          <div className="absolute bottom-20 right-4 sm:bottom-24 sm:right-6 z-10">
            <div className="relative group">
              <button
                onClick={() => {
                  // Trigger silver glow animation
                  setShowSaveGlow(true);
                  setTimeout(() => setShowSaveGlow(false), 1000);
                  // Call the actual save function
                  if (content.trim()) {
                    onSave({
                      content: content.trim(),
                      tags: selectedTags,
                      source,
                      created_at: new Date().toISOString(),
                      user_id: userId, // Let storage handle undefined - it will get real userId
                      sync_status: 'local_only'
                    });
                    // Clear form after save
                    setContent('');
                    setSelectedTags([]);
                    setSource('text');
                    setInterimTranscript('');
                    setLastSaved(new Date());
                  }
                }}
                disabled={!content.trim() || isAutoSaving}
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full silver-button flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAutoSaving ? 'animate-pulse' : ''
                } ${showSaveGlow ? 'silverGlow' : ''}`}
              >
                <svg 
                  className="w-4 h-4 sm:w-6 sm:h-6 text-graphite-charcoal" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </button>
              {/* Tooltip matching existing pattern */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2A2A2A] text-[#E8E8E8] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                {isAutoSaving ? 'Auto-saving...' : 'Save entry'}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-[#2A2A2A]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE HERO MIC (centered under card) */}
      {!showWelcomeOverlay && (promptState === 'hidden' || promptState === 'selected' || promptState === 'showing') && (
        <div className="md:hidden flex justify-center mt-5">
          <div className="relative">
            <button
              type="button"
              ref={mobileMicButtonRef}
              onClick={() => {
                // Trigger the MicButton's internal button
                if (micButtonInternalRef.current) {
                  micButtonInternalRef.current.click();
                } else {
                  // Fallback: find button if ref not set yet
                  const micButton = document.querySelector('[data-mobile-mic-wrapper] button') as HTMLButtonElement;
                  if (micButton) {
                    micButton.click();
                  }
                }
              }}
              className={`
                relative flex items-center justify-center
                w-20 h-20
                rounded-full
                bg-white
                shadow-[0_14px_40px_rgba(0,0,0,0.22)]
                border border-white/80
                transition-transform duration-150
                active:translate-y-[1px]
                ${isVoiceActive ? "ring-2 ring-orange-400/80" : ""}
              `}
              aria-label={isVoiceActive ? "Stop recording" : "Start recording"}
            >
              <svg
                className="w-6 h-6 text-gray-900"
                width="24"
                height="24"
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
            {/* MicButton for functionality - positioned off-screen but functional */}
            <div 
              data-mobile-mic-wrapper 
              className="sr-only"
              ref={(el) => {
                // Store reference to MicButton's internal button
                if (el) {
                  const button = el.querySelector('button') as HTMLButtonElement;
                  if (button) {
                    micButtonInternalRef.current = button;
                  }
                }
              }}
            >
              <MicButton 
                onTranscript={handleVoiceTranscript} 
                onError={handleVoiceError}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tag picker and Status - Compact footer (Desktop only) */}
      <div className="hidden md:block flex-shrink-0 space-y-1">
        <TagPicker
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />

        {/* Status and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {isAutoSaving && (
              <div className="flex items-center gap-1.5 text-xs text-[#8A8A8A]">
                <div className="w-1.5 h-1.5 bg-[#C7C7C7] rounded-full animate-pulse"></div>
                <span className="hidden sm:inline" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>Auto-saving...</span>
                <span className="sm:hidden" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>Saving...</span>
              </div>
            )}
            {lastSaved && !isAutoSaving && (
              <div className="text-xs text-[#8A8A8A]">
                <span className="hidden sm:inline" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>Entry saved · {lastSaved.toLocaleTimeString()}</span>
                <span className="sm:hidden" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>Saved · {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Desktop ghost chips - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
              <button
                onClick={handleManualSave}
                disabled={!content.trim() || isRateLimited}
              className="ghost-chip rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800"
              >
                S
              </button>
              <button
                onClick={() => {
                  const event = new CustomEvent('openJournalHistory');
                  window.dispatchEvent(event);
                }}
              className="ghost-chip rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800"
              >
                H
              </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-[#F8F8F8] border border-[#B8B8B8] text-[#1A1A1A] px-4 py-2 rounded-lg shadow-lg z-50" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
          {isRateLimited ? 'Rate limit exceeded. Please try again later.' : 'Saved locally'}
        </div>
      )}
      
      {/* Rate Limit Warning */}
      {isRateLimited && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">
              Rate limit exceeded. {rateLimitRetryAfter ? `Retry in ${rateLimitRetryAfter}s` : 'Please try again later.'}
            </span>
          </div>
        </div>
      )}

      {/* Voice Error Notification */}
      {voiceError && (
        <div className="fixed top-4 left-4 bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>{voiceError}</span>
          </div>
        </div>
      )}
    </div>
  );
}



