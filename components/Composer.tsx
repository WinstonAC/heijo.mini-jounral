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
  onSaveStateChange?: (state: { isSaving: boolean; isSaved: boolean; error: string | null; isTranscribing?: boolean }) => void; // Optional callback to expose save states
}

export default function Composer({ onSave, onExport, selectedPrompt, userId, fontSize, setFontSize, entryCount = 0, onManualSaveReady, onSaveStateChange }: ComposerProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [source, setSource] = useState<'text' | 'voice'>('text');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voicePauseTimer, setVoicePauseTimer] = useState<NodeJS.Timeout | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  // voiceError state removed - voice errors are logged to console only, not displayed in UI
  const [showToast, setShowToast] = useState(false);
  // Manual save states
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<'ticking' | 'showing' | 'selected' | 'hidden'>('ticking');
  const [currentPrompt, setCurrentPrompt] = useState<{ id: string; text: string } | null>(null);
  const [hasShownToday, setHasShownToday] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Mobile mic refs removed - mobile no longer uses custom MicButton
  const handleManualSaveRef = useRef<() => Promise<void>>();
  const userInitiatedSaveRef = useRef<boolean>(false); // Guard to ensure only user-initiated saves proceed
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [showSaveGlow, setShowSaveGlow] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [isDismissingWelcome, setIsDismissingWelcome] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // Default to true, will check localStorage
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  type MicStatus = 'idle' | 'initializing' | 'ready' | 'unsupported' | 'error';
  const [micStatus, setMicStatus] = useState<MicStatus>('idle');
  const [isTranscribing, setIsTranscribing] = useState(false); // Track when backend STT is recording or processing
  const lastSaveAttemptRef = useRef<number>(0);
  const SAVE_DEBOUNCE_MS = 2000; // Minimum 2 seconds between save attempts
  const lastSavedContentHashRef = useRef<string | null>(null);
  const lastManualSaveTimestampRef = useRef<number>(0); // Track last manual save timestamp for 5-second minimum
  const lastSavedContentStringRef = useRef<string | null>(null); // Track last saved content string for duplicate detection
  const isSaveInProgressRef = useRef<boolean>(false); // Guard to ensure onSave is only called once per save operation
  const MIN_MANUAL_SAVE_INTERVAL_MS = 5000; // Minimum 5 seconds between manual saves
  const DUPLICATE_SAVE_WINDOW_MS = 60000; // 60 seconds window for duplicate detection
  const MIN_SAVING_DISPLAY_MS = 400; // Minimum time to show "Saving..." state
  const MIN_SAVED_DISPLAY_MS = 1000; // Minimum time to show "Saved" state
  
  // Mobile detection hook
  const isMobile = useIsMobile();
  
  // Feature flag to disable FAB
  const ENABLE_FAB = false;
  
  // Beta: Disable auto-save completely - manual save only
  const ENABLE_AUTO_SAVE = process.env.NEXT_PUBLIC_ENABLE_AUTO_SAVE === 'true';

  // Environment sanity check (dev-only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[ENV CHECK]', {
      ENABLE_AUTO_SAVE,
      NEXT_PUBLIC_ENABLE_AUTO_SAVE: process.env.NEXT_PUBLIC_ENABLE_AUTO_SAVE
    });
  }

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
    if (process.env.NODE_ENV === 'development') {
      // Uncomment to reset prompt for testing:
      // localStorage.removeItem('heijo-prompt-shown');
    }
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

  // Handle clicking into textarea or typing - dismiss welcome with smooth transition
  const handleTextareaFocus = useCallback(() => {
    if (showWelcomeOverlay && !isDismissingWelcome) {
      // Start fade-out transition
      setIsDismissingWelcome(true);
      // Delay actual dismissal to allow transition
      setTimeout(() => {
        handleDismissWelcome();
        setIsDismissingWelcome(false);
      }, 150);
    }
  }, [showWelcomeOverlay, handleDismissWelcome, isDismissingWelcome]);

  // Handle typing - dismiss welcome if user starts typing (with smooth transition)
  useEffect(() => {
    if (showWelcomeOverlay && content.trim().length > 0 && !isDismissingWelcome) {
      // Start fade-out transition
      setIsDismissingWelcome(true);
      // Delay actual dismissal to allow transition
      setTimeout(() => {
        handleDismissWelcome();
        setIsDismissingWelcome(false);
      }, 100);
    }
  }, [content, showWelcomeOverlay, handleDismissWelcome, isDismissingWelcome]);

  // Canonical save function - all save paths should use this
  const saveEntry = useCallback(async (saveType: 'manual' | 'auto' | 'voice') => {
    // Single-point guard: Block manual saves only while voice is active or transcription is processing
    // After voice stops and transcription finishes, user CAN save even if source === 'voice'
    if (saveType === 'manual' && (isVoiceActive || isTranscribing)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SAVE BLOCKED] manual save blocked during voice session', {
          isVoiceActive,
          isTranscribing,
          source,
          contentLength: content.length
        });
      }
      return; // Return early - no persistence, no clearing, no "Saved" toast
    }
    
    // Regression-proof guard: Only allow manual saves if user-initiated
    if (saveType === 'manual' && !userInitiatedSaveRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SAVE BLOCKED] manual save blocked - not user-initiated', {
          isVoiceActive,
          source,
          contentLength: content.length
        });
      }
      return; // Return early - prevents any non-user-initiated saves
    }
    
    // FIXED: For voice entries, merge interimTranscript into content before saving
    // This ensures what the user sees in the textarea matches what gets saved
    let contentToSave = content.trim();
    let finalInterimTranscript = '';
    
    if (source === 'voice' && interimTranscript.trim()) {
      // Merge interim transcript into content for saving
      finalInterimTranscript = interimTranscript.trim();
      contentToSave = (content.trim() + (content.trim() ? ' ' : '') + finalInterimTranscript).trim();
    }
    
    if (!contentToSave) {
      // Only show error for manual saves AND if user has interacted
      // This prevents toast on initial mount/login before user does anything
      if (saveType === 'manual' && hasUserInteracted) {
        setSaveError('Entry cannot be empty');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 3000);
      }
      // Silently return for auto-save or if user hasn't interacted yet
      return;
    }

    // Strong duplicate save protection - check content, tags, source, and timestamp
    const contentHash = `${contentToSave}-${selectedTags.join(',')}-${source}`;
    const now = Date.now();
    const timeSinceLastSave = now - lastManualSaveTimestampRef.current;
    
    // Check if this is a duplicate save within the time window
    if (saveType === 'manual' && lastSavedContentStringRef.current !== null) {
      const isIdenticalContent = contentToSave === lastSavedContentStringRef.current;
      const isIdenticalTags = selectedTags.join(',') === (lastSavedContentStringRef.current.split('|TAGS|')[1] || '');
      const isIdenticalSource = source === (lastSavedContentStringRef.current.split('|SOURCE|')[1] || 'text');
      
      if (isIdenticalContent && isIdenticalTags && isIdenticalSource && timeSinceLastSave < DUPLICATE_SAVE_WINDOW_MS) {
        if (process.env.NODE_ENV === 'development') {
          console.info('[Heijo][Save] Duplicate or rapid save blocked');
        }
        setSaveError('This entry looks identical to your last saved entry.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 3000);
        return;
      }
    }
    
    // Also check hash for additional protection
    if (contentHash === lastSavedContentHashRef.current && timeSinceLastSave < DUPLICATE_SAVE_WINDOW_MS) {
      if (saveType === 'manual') {
        if (process.env.NODE_ENV === 'development') {
          console.info('[Heijo][Save] Duplicate or rapid save blocked');
        }
        setSaveError('This entry looks identical to your last saved entry.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 3000);
      }
      return;
    }

    // Prevent rapid saves - debounce (general protection)
    // Reuse 'now' variable declared earlier for duplicate save protection
    if (now - lastSaveAttemptRef.current < SAVE_DEBOUNCE_MS) {
      if (saveType === 'manual') {
        setSaveError('Saving too quickly, please wait a moment.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 2000);
      }
      return;
    }

    // Enforce minimum 5-second window between manual saves
    if (saveType === 'manual') {
      const timeSinceLastManualSave = now - lastManualSaveTimestampRef.current;
      if (timeSinceLastManualSave > 0 && timeSinceLastManualSave < MIN_MANUAL_SAVE_INTERVAL_MS) {
        if (process.env.NODE_ENV === 'development') {
          console.info('[Heijo][Save] Duplicate or rapid save blocked');
        }
        setSaveError('Please wait a moment before saving again.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 2000);
        return;
      }
    }

    // Don't attempt save if rate limited
    if (isRateLimited) {
      if (saveType === 'manual') {
        setSaveError('Rate limit exceeded. Please try again later.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 3000);
      }
      return;
    }

    // Don't save if already saving
    if (isSaving || isSaveInProgressRef.current) {
      if (saveType === 'manual') {
        setSaveError('Still saving your previous entry...');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 2000);
      }
      return;
    }

    // Cancel auto-save timeout if manual save is triggered
    if (saveType === 'manual' && autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    lastSaveAttemptRef.current = now;
    if (saveType === 'manual') {
      lastManualSaveTimestampRef.current = now;
      isSaveInProgressRef.current = true; // Set guard to prevent double calls
    }
    
    // Set saving state with minimum display time
    setIsSaving(true);
    setIsAutoSaving(saveType === 'auto');
    setIsSaved(false);
    setSaveError(null);
    
    // Track minimum display time for "Saving..." state
    const savingStartTime = Date.now();

    // Stop voice recording if active and this is a manual save
    // Note: On mobile, users use keyboard mic, so this only applies to desktop MicButton
    if (saveType === 'manual' && isVoiceActive) {
      // Desktop MicButton handles its own stop logic
      // Mobile no longer uses custom MicButton, so no action needed
      setIsVoiceActive(false);
      setInterimTranscript('');
    }

    try {
      // Only persist to backend/history for manual saves
      // Auto and voice saveTypes are for local state management only
      let savedEntry = null;
      if (saveType === 'manual') {
        // Ensure minimum "Saving..." display time
        const savingElapsed = Date.now() - savingStartTime;
        const remainingSavingTime = Math.max(0, MIN_SAVING_DISPLAY_MS - savingElapsed);
        
        if (remainingSavingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingSavingTime));
        }
        
        // Call onSave exactly once per manual save (guard ensures no double calls)
        if (isSaveInProgressRef.current) {
          savedEntry = await onSave({
            content: contentToSave,
            source,
            tags: selectedTags,
            created_at: new Date().toISOString(),
            user_id: userId,
            sync_status: 'local_only'
          });
          // Clear guard after successful save
          isSaveInProgressRef.current = false;
        }

        // Persist saved content string for duplicate detection (keep for 60 seconds)
        lastSavedContentStringRef.current = `${contentToSave}|TAGS|${selectedTags.join(',')}|SOURCE|${source}`;
        lastSavedContentHashRef.current = contentHash; // Keep hash for additional protection
        setLastSaved(new Date());
        setIsRateLimited(false);
        setRateLimitRetryAfter(null);

        // Clear content and reset state after successful manual save
        if (process.env.NODE_ENV === 'development') {
          console.trace('[CONTENT CLEAR]', {
            saveType,
            source,
            contentLength: content.length
          });
        }
        setContent('');
        setSelectedTags([]);
        setInterimTranscript(''); // Clear interim transcript after save
        setSource('text');
        setHasUserInteracted(false); // Reset interaction flag
        setIsVoiceActive(false); // Ensure voice state is cleared
        
        // Show "Saved" state with minimum display time (manual saves only)
        setIsSaved(true);
        setShowToast(true);
        
        // Clear saved content string after duplicate window expires
        setTimeout(() => {
          lastSavedContentStringRef.current = null;
        }, DUPLICATE_SAVE_WINDOW_MS);
        
        // Clear "Saved" state after minimum display time
        setTimeout(() => setIsSaved(false), MIN_SAVED_DISPLAY_MS);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        // For auto/voice saveTypes, only update local state (no backend persistence)
        // Update content hash for deduplication, but don't persist
        lastSavedContentHashRef.current = contentHash;
        setLastSaved(new Date());
        setIsRateLimited(false);
        setRateLimitRetryAfter(null);
      }
      
    } catch (error) {
      // Only log errors for manual saves (auto/voice don't persist, so no error to report)
      if (saveType === 'manual') {
        console.error(`${saveType} save failed:`, error);
      }

      if (error instanceof Error && error.message.includes('Rate limit')) {
        setIsRateLimited(true);
        const retryMatch = error.message.match(/try again later/i);
        if (retryMatch) {
          setRateLimitRetryAfter(60);
        }
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        if (saveType === 'manual') {
          setSaveError('Rate limit exceeded. Please try again later.');
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setSaveError(null);
          }, 3000);
        }
        return;
      }

      // For manual saves, only show error if it's a critical failure (rate limit or local save failure)
      // Cloud sync failures are handled gracefully - entry is saved locally and UI is updated
      if (saveType === 'manual') {
        // Only show error for critical failures (rate limit already handled above)
        // Local save failures will throw and be caught here
        setSaveError('Failed to save entry. Please try again.');
        setShowToast(true);
        // Reset hash and saved content on error so user can retry with same content
        lastSavedContentHashRef.current = null;
        lastSavedContentStringRef.current = null;
        setTimeout(() => {
          setShowToast(false);
          setSaveError(null);
        }, 3000);
      }

      // Voice-specific error logging only for manual saves
      if (saveType === 'manual' && source === 'voice') {
        console.warn('Mic transcription ready, but save failed:', error);
      }
    } finally {
      setIsSaving(false);
      setIsAutoSaving(false);
      // Clear save guard in finally to ensure it's reset even on error
      if (saveType === 'manual') {
        isSaveInProgressRef.current = false;
      }
    }
  }, [content, source, selectedTags, userId, onSave, isRateLimited, isSaving, isVoiceActive, isTranscribing, interimTranscript, hasUserInteracted]);

  const handleAutoSave = useCallback(async () => {
    await saveEntry('auto');
  }, [saveEntry]);

  // Auto-save functionality (7 seconds after content changes)
  // BETA: Disabled completely - manual save only
  useEffect(() => {
    if (!ENABLE_AUTO_SAVE) {
      // Clear any existing timeout if auto-save is disabled
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      return;
    }
    
    // Don't set up auto-save if rate limited or already saving
    if (isRateLimited || isSaving) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      return;
    }
    
    // Don't auto-save voice entries - wait for manual save
    if (source === 'voice') {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      return;
    }
    
    if (content.trim() && content.length > 10 && !isAutoSaving && !isSaving) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (7 seconds)
      autoSaveTimeoutRef.current = setTimeout(() => {
        // Double-check we're not already saving and not rate limited before executing
        if (!isAutoSaving && !isRateLimited && !isSaving) {
          handleAutoSave();
        }
      }, 7000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, handleAutoSave, isAutoSaving, isRateLimited, isSaving, source, ENABLE_AUTO_SAVE, isVoiceActive, isTranscribing]);

  // Keyboard shortcuts for save functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + S or Cmd/Ctrl + Enter
      if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'Enter')) {
        event.preventDefault(); // Prevent browser save dialog
        
        if (content.trim() && !isRateLimited) {
          if (process.env.NODE_ENV === 'development') {
            console.info('Save triggered via keyboard shortcut');
            console.trace('[TRACE] keyboard shortcut triggered save', {
              key: event.key,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
              isVoiceActive,
              source,
              contentLength: content.length
            });
          }
          // Trigger silver glow animation
          setShowSaveGlow(true);
          setTimeout(() => setShowSaveGlow(false), 1000);
          // Use ref to call handleManualSave to respect rate limits and debouncing
          // Set user-initiated flag before calling
          try {
            userInitiatedSaveRef.current = true;
            if (handleManualSaveRef.current) {
              handleManualSaveRef.current();
            }
          } finally {
            userInitiatedSaveRef.current = false;
          }
        } else if (isRateLimited) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Save blocked: Rate limit exceeded');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, isRateLimited, isVoiceActive, source]); // Removed handleManualSave from deps - use ref instead

  const handleVoiceTranscript = (transcript: string, isFinal?: boolean) => {
    // Mark user interaction when voice transcript arrives
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    if (isFinal) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Mic transcription complete, ready for saving');
      }
      
      // Track analytics for voice recording
      analyticsCollector.trackEvent('voice_recording_start');
      analyticsCollector.trackEvent('voice_to_text_used');
      
      // FIXED: Merge final transcript with existing content (don't replace)
      // This ensures voice additions append to any existing text
      const mergedContent = content.trim() 
        ? (content.trim() + ' ' + transcript.trim()).trim()
        : transcript.trim();
      
      setContent(mergedContent);
      setInterimTranscript(''); // Clear interim
      setSource('voice');
      setIsVoiceActive(true);
      // Clear isTranscribing when final transcript arrives - processing is complete
      setIsTranscribing(false);

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
      // Mark interaction on interim results too (recording has started)
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
      }
    }
  };

  const handleVoiceError = (error: string) => {
    // Log voice errors to console for debugging, but do not show in UI
    console.error('[Heijo][Voice] Error:', error);
    setIsVoiceActive(false);
    setInterimTranscript('');
    setMicStatus('error');
    // Clear isTranscribing when error occurs - processing is done
    setIsTranscribing(false);
    // Do NOT set voiceError state - no UI messages for voice errors
  };

  // Mic lifecycle callbacks for mobile hero button
  const handleMicStart = useCallback(() => {
    setIsVoiceActive(true);
    setMicStatus('ready');
    // Mark user interaction when mic starts recording
    setHasUserInteracted(true);
    // Set isTranscribing to true when recording starts (for backend STT)
    setIsTranscribing(true);
  }, []);

  const handleMicStop = useCallback(() => {
    setIsVoiceActive(false);
    setMicStatus('ready');
    // Keep isTranscribing true when recording stops - backend STT processing is about to start
    // It will be set to false when final transcript arrives or error occurs
    // This prevents Save during the async processing phase
  }, []);

  const handleMicUnsupported = useCallback(() => {
    setMicStatus('unsupported');
    // Log unsupported state to console, but do not show in UI
    console.warn('[Heijo][Voice] Unsupported: Voice journaling is not supported on this browser');
    // Do NOT set voiceError state - no UI messages for voice errors
  }, []);

  // Mobile mic ref setup removed - mobile no longer uses custom MicButton
  // Desktop MicButton is rendered separately and doesn't need this ref setup

  const handleManualSave = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.trace('[TRACE] handleManualSave called', {
        isVoiceActive,
        source,
        isTranscribing,
        contentLength: content.length
      });
    }
    try {
      userInitiatedSaveRef.current = true;
      await saveEntry('manual');
    } finally {
      userInitiatedSaveRef.current = false;
    }
  }, [saveEntry, isVoiceActive, source, isTranscribing, content]);

  // Store latest handleManualSave in ref (update ref directly, no useEffect to avoid loops)
  handleManualSaveRef.current = handleManualSave;

  // Expose manual save function to parent for mobile bottom nav
  // Use useCallback to create a stable reference that directly calls saveEntry
  const stableSaveFn = useCallback(async () => {
    await saveEntry('manual');
  }, [saveEntry]);

  useEffect(() => {
    if (onManualSaveReady) {
      // Call immediately - stableSaveFn is already stable and safe to use
      onManualSaveReady(stableSaveFn);
    }
  }, [onManualSaveReady, stableSaveFn]);

  // Expose save states to parent for mobile button
  useEffect(() => {
    if (onSaveStateChange) {
      // Defer to avoid setState during render
      queueMicrotask(() => {
      onSaveStateChange({
        isSaving,
        isSaved,
        error: saveError,
        isTranscribing // Expose isTranscribing state to parent for mobile Save button
        });
      });
    }
  }, [isSaving, isSaved, saveError, isTranscribing, onSaveStateChange]);

  // Mobile mic ref setup removed - mobile no longer uses custom MicButton
  // Desktop MicButton is rendered separately and doesn't need this ref setup

  // Listen for mobile save event from bottom nav (fallback)
  useEffect(() => {
    const handleMobileSave = () => {
      if (process.env.NODE_ENV === 'development') {
        console.trace('[TRACE] window mobileSave event received', {
          isVoiceActive,
          source,
          isTranscribing,
          contentLength: content.length
        });
      }
      // Block save if voice is active (extra safety)
      if (isVoiceActive) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[MOBILE-SAVE] Blocked: voice is active');
        }
        return;
      }
      
      // Only allow save if explicitly triggered by user action
      // The mobile Save button should call handleManualSaveRef directly, not dispatch this event
      try {
        userInitiatedSaveRef.current = true;
        if (handleManualSaveRef.current) {
          handleManualSaveRef.current();
        }
      } finally {
        userInitiatedSaveRef.current = false;
      }
    };
    window.addEventListener('mobileSave', handleMobileSave);
    return () => window.removeEventListener('mobileSave', handleMobileSave);
  }, [isVoiceActive, source, content, isTranscribing]); // Include dependencies to check current state

  // Listen for manual prompt request from Settings
  useEffect(() => {
    const handleRequestPrompt = () => {
      // Clear the dismissed state
      const today = new Date().toDateString();
      localStorage.removeItem('heijo-prompt-shown');
      setHasShownToday(false);
      setPromptState('ticking');
    };
    window.addEventListener('requestPrompt', handleRequestPrompt);
    return () => window.removeEventListener('requestPrompt', handleRequestPrompt);
  }, []);

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
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4" role="group" aria-label="Prompt response options">
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
            <div className="flex flex-wrap items-center gap-2 justify-end sm:justify-start" role="group" aria-label="Prompt actions">
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
        {/* DESKTOP MIC – positioned outside textarea, above it */}
        <div className="hidden md:flex md:justify-end md:mb-3 md:mr-4">
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
        {/* Graphite charcoal typing area with silver focus */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="relative w-full flex-1 min-h-0">
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
                className="w-full rounded-[14px] border border-white/10 journal-input p-6 sm:p-8 flex flex-col justify-center transition-opacity duration-150"
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  background: '#171717',
                  color: 'var(--text-inverse)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28), 0 6px 20px rgba(0,0,0,0.2)',
                  opacity: isDismissingWelcome ? 0 : 1,
                  pointerEvents: isDismissingWelcome ? 'none' : 'auto',
                  ...(promptState === "hidden"
                    ? (
                        isMobile
                          ? {
                              height: "calc(100dvh - 14rem)",
                              transition: "height 0.3s ease, opacity 0.15s ease",
                            }
                          : {
                              height: "clamp(360px, calc(100dvh - 21rem), 520px)",
                              transition: "height 0.3s ease, opacity 0.15s ease",
                            }
                      )
                    : {
                        minHeight: "200px",
                        transition: "opacity 0.15s ease",
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
                    <p>• Speak or type your thoughts</p>
                    <p>• Save your entry</p>
                    <p>• Multilingual voice support available in Settings</p>
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
                value={
                  isVoiceActive && interimTranscript
                    ? content + (content.trim() ? ' ' : '') + interimTranscript
                    : content
                }
                onChange={(e) => {
                  setContent(e.target.value);
                  setSource('text');
                  setInterimTranscript(''); // Clear interim when typing
                  // Mark user interaction when typing
                  if (!hasUserInteracted) {
                    setHasUserInteracted(true);
                  }
                }}
                onFocus={(e) => {
                  handleTextareaFocus();
                  // Mark user interaction when focusing textarea
                  if (!hasUserInteracted) {
                    setHasUserInteracted(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                onScroll={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 5;
                  setIsUserScrolled(!isAtBottom);
                }}
                placeholder="Type or speak your thoughts..."
                className={`w-full resize-none rounded-[14px] border border-white/10 bg-transparent focus:outline-none text-gray-100 p-3 sm:p-4 lg:p-5 journal-input transition-all duration-300 ${getFontSizeClass()} ${
                  promptState === "hidden"
                    ? (isMobile ? "overflow-y-auto scrollbar-thin" : "h-full overflow-y-auto scrollbar-thin") // Scrollable on mobile, fill on desktop
                    : "min-h-[160px] sm:min-h-[200px] overflow-y-auto scrollbar-thin" // Standard height with scroll
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
                              // ✅ DESKTOP: Fill available vertical space (elongated) - no prompt
                              height: "calc(100vh - 28rem)",
                              minHeight: "450px",
                              maxHeight: "none",
                              transition: "height 0.3s ease",
                            }
                      )
                    : (
                        isMobile
                          ? {
                              // ✅ MOBILE: taller textarea for better mobile experience
                              minHeight: "45vh",
                              maxHeight: "55vh",
                              height: "auto",
                              transition: "height 0.3s ease",
                            }
                          : {
                              // ✅ DESKTOP: Fill available vertical space (elongated) - with prompt
                              // Account for prompt height (~6rem) + spacing (~1rem) = ~7rem extra
                              height: "calc(100vh - 35rem)",
                              minHeight: "400px",
                              maxHeight: "none",
                              transition: "height 0.3s ease",
                            }
                      ))
                }}
              />
            )}
            
            {/* Jump to live button */}
            {isUserScrolled && isVoiceActive && (
              <button
                className="absolute bottom-4 left-4 bg-graphite-charcoal text-text-inverse text-sm px-4 py-2 rounded-lg hover:bg-soft-silver hover:text-graphite-charcoal transition-all duration-300 animate-fade-in shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
                onClick={() => {
                  if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                    setIsUserScrolled(false);
                  }
                }}
                aria-label="Jump to live transcript"
              >
                Jump to live
              </button>
            )}
            
            {/* Live transcript indicator */}
            {interimTranscript && (
              <div 
                className="absolute bottom-4 right-4 bg-graphite-charcoal text-text-inverse text-sm px-4 py-2 rounded-lg opacity-90 animate-fade-in shadow-lg"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-soft-silver rounded-full animate-pulse" aria-hidden="true"></div>
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
                  if (process.env.NODE_ENV === 'development') {
                    console.trace('[TRACE] FAB save button clicked save', {
                      isVoiceActive,
                      source,
                      isTranscribing,
                      contentLength: content.length
                    });
                  }
                  // Trigger silver glow animation
                  setShowSaveGlow(true);
                  setTimeout(() => setShowSaveGlow(false), 1000);
                  // Use canonical save function
                  try {
                    userInitiatedSaveRef.current = true;
                    if (handleManualSaveRef.current) {
                      handleManualSaveRef.current();
                    }
                  } finally {
                    userInitiatedSaveRef.current = false;
                  }
                }}
                disabled={!content.trim() || isAutoSaving || isSaving || isTranscribing || isVoiceActive}
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

      {/* MOBILE HERO SAVE BUTTON (centered under card) */}
      {!showWelcomeOverlay && (promptState === 'hidden' || promptState === 'selected' || promptState === 'showing') && (
        <div className="md:hidden flex flex-col items-center gap-3 mt-5">
          {/* Hero Save Button */}
          <button
            type="button"
            onClick={async () => {
              if (process.env.NODE_ENV === 'development') {
                console.trace('[TRACE] mobile hero save button clicked save', {
                  isVoiceActive,
                  source,
                  isTranscribing,
                  contentLength: content.length
                });
              }
              // Call the same manual save handler used by the bottom nav
              try {
                userInitiatedSaveRef.current = true;
                if (handleManualSaveRef.current) {
                  await handleManualSaveRef.current();
                }
              } finally {
                userInitiatedSaveRef.current = false;
              }
            }}
                disabled={!content.trim() || isSaving || isTranscribing || isVoiceActive}
            className={`
              relative flex flex-col items-center justify-center gap-1.5
              px-6 py-4
              rounded-full
              bg-white
              shadow-[0_14px_40px_rgba(0,0,0,0.22)]
              border border-white/80
              transition-transform duration-150
              active:translate-y-[1px]
              disabled:opacity-50 disabled:cursor-not-allowed
              min-w-[120px]
              ${isSaving ? "animate-pulse" : ""}
            `}
            aria-label={isSaving ? "Saving..." : isSaved ? "Saved" : "Save entry"}
          >
            {isSaving ? (
              <>
                <svg
                  className="w-5 h-5 text-gray-900 animate-spin"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Saving…</span>
              </>
            ) : isSaved ? (
              <>
                <svg
                  className="w-5 h-5 text-gray-900"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Saved</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 text-gray-900"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Save</span>
              </>
            )}
          </button>
          
          {/* Mobile keyboard mic hint */}
          <p className="text-xs text-text-caption text-center px-4 max-w-sm" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
            Tip: On your phone, use the microphone on your keyboard to dictate your entry.
          </p>
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
                onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.trace('[TRACE] desktop Save ghost chip clicked save', {
                      isVoiceActive,
                      source,
                      isTranscribing,
                      contentLength: content.length
                    });
                  }
                  handleManualSave();
                }}
                disabled={!content.trim() || isRateLimited || isSaving || isTranscribing || isVoiceActive}
              className="ghost-chip rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800"
              >
                {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => {
                  const event = new CustomEvent('openJournalHistory');
                  window.dispatchEvent(event);
                }}
              className="ghost-chip rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800"
              >
                History
              </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications - Manual save only */}
      {showToast && (
        <div 
          className="fixed top-4 right-4 bg-[#F8F8F8] border border-[#B8B8B8] text-[#1A1A1A] px-4 py-2 rounded-lg shadow-lg z-50" 
          style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {saveError || 'Saved'}
        </div>
      )}

      {/* Voice Error Notification - REMOVED: Voice errors are logged to console only, not displayed in UI */}
    </div>
  );
}



