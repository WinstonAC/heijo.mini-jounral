'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MicButton from './MicButton';
import TagPicker from './TagPicker';
import HeaderClock from './HeaderClock';
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
}

export default function Composer({ onSave, onExport, selectedPrompt, userId, fontSize, setFontSize, entryCount = 0 }: ComposerProps) {
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
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [showSaveGlow, setShowSaveGlow] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // Default to true, will check localStorage
  
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

  // Reset prompt for testing - remove this in production
  useEffect(() => {
    // Uncomment the line below to reset prompts for testing
    localStorage.removeItem('heijo-prompt-shown');
  }, []);

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

    setIsAutoSaving(true);
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
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Check if this was a voice transcription that failed to save
      if (source === 'voice') {
        console.warn('Mic transcription ready, but Supabase save failed:', error);
      }
    } finally {
      setIsAutoSaving(false);
    }
  }, [content, source, selectedTags, userId, onSave]);

  // Auto-save functionality (5-10 seconds)
  useEffect(() => {
    if (content.trim() && content.length > 10) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (7 seconds)
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 7000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, handleAutoSave]);

  // Keyboard shortcuts for save functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + S or Cmd/Ctrl + Enter
      if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'Enter')) {
        event.preventDefault(); // Prevent browser save dialog
        
        if (content.trim()) {
          console.info('Save triggered via keyboard shortcut');
          // Trigger silver glow animation
          setShowSaveGlow(true);
          setTimeout(() => setShowSaveGlow(false), 1000);
          // Call the actual save function
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, selectedTags, source, userId, onSave]);

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

  const handleManualSave = async () => {
    if (!content.trim()) return;

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
    } catch (error) {
      console.error('Manual save failed:', error);
      // Check if this was a voice transcription that failed to save
      if (source === 'voice') {
        console.warn('Mic transcription ready, but Supabase save failed:', error);
      }
    }
  };

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

      {/* Prompt Question - Minimal floating card */}
      {promptState === 'ticking' && !hasShownToday && !showWelcomeOverlay && (
        <div className="fixed inset-0 bg-graphite-charcoal bg-opacity-60 flex items-center justify-center z-50">
          <div className="prompt-bubble rounded-xl p-8 max-w-md mx-4">
            <div className="text-center">
              <p className="text-graphite-charcoal font-medium text-xl mb-8 leading-relaxed subheading">
                Would you like a prompt today?
              </p>
              <div className="flex gap-4 justify-center mb-4">
                <button
                  onClick={handlePromptYes}
                  className="px-6 py-3 text-sm font-medium silver-button text-graphite-charcoal rounded-lg transition-all duration-300"
                >
                  Yes
                </button>
                <button
                  onClick={handlePromptNo}
                  className="px-6 py-3 text-sm font-medium outline-button rounded-lg transition-all duration-300"
                >
                  No
                </button>
              </div>
              <button
                onClick={handlePromptNo}
                className="text-xs text-text-caption hover:text-graphite-charcoal transition-colors duration-200 caption-text"
              >
                Skip
              </button>
            </div>
          </div>

    {/* Mobile Toolbar */}
    <div className="md:hidden pt-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
      <div className="sticky bottom-3 z-30">
        <div className="flex items-center justify-between gap-3 rounded-full border border-[#e5e5e5] bg-white/95 shadow-[0_6px_18px_rgba(0,0,0,0.08)] px-3 py-2">
          <div className="relative">
            <MicButton 
              onTranscript={handleVoiceTranscript} 
              onError={handleVoiceError}
            />
            {isVoiceActive && (
              <div className="pointer-events-none absolute inset-[-6px] rounded-full border border-orange-400/60"></div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm font-medium tracking-[0.12em] uppercase">
            <button
              onClick={handleManualSave}
              disabled={!content.trim()}
              className="ghost-chip rounded-full px-3 py-2 text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800 disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={() => {
                const event = new CustomEvent('openJournalHistory');
                window.dispatchEvent(event);
              }}
              className="ghost-chip rounded-full px-3 py-2 text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800"
            >
              History
            </button>
          </div>
        </div>
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

      {/* Mic Button - Desktop */}
      <div className="hidden md:flex flex-shrink-0 items-center justify-end gap-3 text-xs text-text-caption">
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

      {/* Journal entry section - Full width dominant */}
      <div className="flex-1 flex flex-col min-h-0 pb-20 sm:pb-0">
        {/* Graphite charcoal typing area with silver focus */}
        <div className="relative flex-1">
          <div className="relative w-full h-full">
            {showWelcomeOverlay ? (
              // Welcome message displayed inside the textarea area
              <div 
                className="w-full rounded-[14px] border border-white/10 journal-input p-6 sm:p-8 flex flex-col justify-center"
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  background: '#1B1B1A',
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
                    ? "flex-1 h-full min-h-0" // Fill space when prompt hidden
                    : "min-h-[200px] sm:min-h-[250px]" // Standard height when prompt visible
                }`}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  lineHeight: '1.6',
                  background: '#1B1B1A',
                  color: 'var(--text-inverse)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28), 0 6px 20px rgba(0,0,0,0.2)',
                  ...(promptState === "hidden"
                    ? (
                        isMobile
                          ? {
                              // ✅ MOBILE: current perfect behavior (no change)
                              height: "calc(100dvh - 14rem)",
                              transition: "height 0.3s ease",
                            }
                          : {
                              // ✅ DESKTOP (MacBook): balanced and visually centered
                              //   - leaves just enough space for buttons & rounded base
                              //   - never too tall or cramped
                              height: "clamp(360px, calc(100dvh - 21rem), 520px)",
                              transition: "height 0.3s ease",
                            }
                      )
                    : undefined)
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

      {/* Tag picker and Status - Compact footer */}
      <div className="flex-shrink-0 space-y-1">
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

          {/* Desktop ghost chips */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
              <button
                onClick={handleManualSave}
                disabled={!content.trim()}
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
          Saved locally
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



