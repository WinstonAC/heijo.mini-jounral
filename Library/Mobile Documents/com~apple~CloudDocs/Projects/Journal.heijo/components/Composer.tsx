'use client';

import { useState, useEffect, useRef } from 'react';
import MicButton from './MicButton';
import TagPicker from './TagPicker';
import HeaderClock from './HeaderClock';
import { JournalEntry } from '@/lib/store';
import { getPrompt, logPromptHistory } from '@/lib/pickPrompt';

interface ComposerProps {
  onSave: (entry: Omit<JournalEntry, 'id'>) => void;
  onExport: () => void;
  selectedPrompt?: { id: string; text: string } | null;
  userId?: string;
}

export default function Composer({ onSave, onExport, selectedPrompt, userId }: ComposerProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [source, setSource] = useState<'text' | 'voice'>('text');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voicePauseTimer, setVoicePauseTimer] = useState<NodeJS.Timeout | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showToast, setShowToast] = useState(false);
  const [promptState, setPromptState] = useState<'ticking' | 'showing' | 'selected' | 'hidden'>('ticking');
  const [currentPrompt, setCurrentPrompt] = useState<{ id: string; text: string } | null>(null);
  const [hasShownToday, setHasShownToday] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrolled, setIsUserScrolled] = useState(false);

  // Check if we've shown a prompt today
  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('heijo-prompt-shown');
    if (lastShown === today) {
      setHasShownToday(true);
      setPromptState('hidden');
    } else {
      // Show prompt question on load if not shown today
      setPromptState('ticking');
    }
  }, []);

  // Reset prompt for testing - remove this in production
  useEffect(() => {
    // Uncomment the line below to reset prompts for testing
    localStorage.removeItem('heijo-prompt-shown');
  }, []);

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
  }, [content]);

  const handleAutoSave = async () => {
    if (!content.trim()) return;

    setIsAutoSaving(true);
    try {
      const savedEntry = await onSave({
        content: content.trim(),
        source,
        tags: selectedTags,
        created_at: new Date().toISOString(),
        sync_status: 'local_only'
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleVoiceTranscript = (transcript: string, isFinal?: boolean) => {
    if (isFinal) {
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
    }
  };

  const handleExport = () => {
    onExport();
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
    <div className="h-full flex flex-col space-y-4 sm:space-y-6">
      {/* Digital-style Date/Time Display */}
      <div className="flex-shrink-0">
        <HeaderClock />
      </div>

      {/* Prompt Question - Full screen overlay */}
      {promptState === 'ticking' && !hasShownToday && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#F8F8F8] border border-[#C7C7C7] rounded-lg p-6 shadow-lg max-w-md mx-4">
            <div className="text-center">
              <p className="text-[#1A1A1A] font-medium text-lg mb-6" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
                Would you like a prompt today?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handlePromptYes}
                  className="px-6 py-3 text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors duration-100 rounded"
                  style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
                >
                  Yes
                </button>
                <button
                  onClick={handlePromptNo}
                  className="px-6 py-3 text-sm font-medium border border-[#B8B8B8] text-[#6A6A6A] hover:bg-[#F0F0F0] transition-colors duration-100 rounded"
                  style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Display - At top of screen */}
      {promptState === 'showing' && currentPrompt && (
        <div className="flex-shrink-0 bg-[#F8F8F8] border border-[#C7C7C7] rounded px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[#1A1A1A] font-medium text-sm flex-1 pr-4" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
              {currentPrompt.text}
            </p>
            <button
              onClick={handleSelectPrompt}
              className="px-4 py-2 text-xs font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-colors duration-100 rounded"
              style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
            >
              Use This
            </button>
          </div>
        </div>
      )}

      {/* Selected Prompt Display - At top of screen */}
      {promptState === 'selected' && currentPrompt && (
        <div className="flex-shrink-0 bg-[#F8F8F8] border border-[#C7C7C7] rounded px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[#1A1A1A] font-medium text-sm" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
              {currentPrompt.text}
            </p>
            <div className="text-xs text-[#8A8A8A] font-medium" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
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

      {/* Typography Controls and Mic Button */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 sm:gap-3 text-xs text-[#8A8A8A]">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-xs" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>Font:</span>
          <div className="flex items-center gap-1">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-100 flex items-center justify-center text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 ${
                  fontSize === size
                    ? 'bg-[#F0F0F0] border-[#8A8A8A] text-[#1A1A1A] shadow-[0_0_8px_rgba(59,130,246,0.3)] ring-2 ring-blue-400 ring-opacity-50'
                    : 'bg-[#F8F8F8] border-[#B8B8B8] text-[#6A6A6A] hover:bg-[#F0F0F0] hover:border-[#8A8A8A] hover:shadow-[0_0_4px_rgba(59,130,246,0.2)]'
                }`}
                style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
              >
                {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Mic button - parallel to font buttons */}
        <div className="relative group">
          <MicButton 
            onTranscript={handleVoiceTranscript} 
            onError={handleVoiceError}
          />
          {isVoiceActive && (
            <div className="absolute -inset-1 bg-[#C7C7C7] rounded-lg animate-pulse opacity-30"></div>
          )}
        </div>
      </div>

      {/* Journal entry section - Full width */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Dark central typing box with silver bevel - edge to edge */}
        <div className="relative flex-1">
          <div className="relative w-full h-full">
            <textarea
              ref={textareaRef}
              value={content + (interimTranscript ? ` ${interimTranscript}` : '')}
              onChange={(e) => {
                setContent(e.target.value);
                setSource('text');
                setInterimTranscript(''); // Clear interim when typing
              }}
              onKeyDown={handleKeyDown}
              onScroll={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 5;
                setIsUserScrolled(!isAtBottom);
              }}
              placeholder="Type or speak your thoughts..."
              className={`w-full h-full min-h-[200px] p-3 sm:p-4 journal-screen border-2 border-[#C7C7C7] focus:border-[#E8E8E8] focus:outline-none focus:ring-0 resize-none transition-all duration-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_15px_rgba(184,184,184,0.2)] ${getFontSizeClass()}`}
              style={{ 
                fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
                borderRadius: '8px', // Slightly beveled, not fully rounded
                lineHeight: '1.5'
              }}
            />
            
            {/* Jump to live button */}
            {isUserScrolled && isVoiceActive && (
              <div className="absolute bottom-2 left-2 bg-[#0D6EFD] text-white text-xs px-3 py-1 rounded cursor-pointer hover:bg-[#0B5ED7] transition-colors duration-100 animate-fade-in"
                   onClick={() => {
                     if (textareaRef.current) {
                       textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                       setIsUserScrolled(false);
                     }
                   }}
                   style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
                Jump to live
              </div>
            )}
            
            {/* Live transcript indicator */}
            {interimTranscript && (
              <div className="absolute bottom-2 right-2 bg-[#2A2A2A] text-[#E8E8E8] text-xs px-2 py-1 rounded opacity-75 animate-fade-in">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-[#0D6EFD] rounded-full animate-pulse"></div>
                  <span style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>Listening...</span>
                </div>
              </div>
            )}
          </div>
          {/* Silver bevel effect */}
          <div className="absolute inset-0 pointer-events-none rounded-lg border border-[#E8E8E8] opacity-30"></div>
        </div>
      </div>

      {/* Tag picker and Status - Compact footer */}
      <div className="flex-shrink-0 space-y-2">
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative group">
              <button
                onClick={handleManualSave}
                disabled={!content.trim()}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed bg-[#F8F8F8] border-[#C7C7C7] text-[#6A6A6A] hover:bg-[#F0F0F0] hover:border-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
              >
                S
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2A2A2A] text-[#E8E8E8] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                Save
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-[#2A2A2A]"></div>
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={handleExport}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all duration-100 bg-[#F8F8F8] border-[#C7C7C7] text-[#6A6A6A] hover:bg-[#F0F0F0] hover:border-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
              >
                E
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2A2A2A] text-[#E8E8E8] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                Export
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-[#2A2A2A]"></div>
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={() => {
                  // This will be handled by the parent component
                  const event = new CustomEvent('openJournalHistory');
                  window.dispatchEvent(event);
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all duration-100 bg-[#F8F8F8] border-[#C7C7C7] text-[#6A6A6A] hover:bg-[#F0F0F0] hover:border-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
              >
                H
              </button>
              <div className="absolute bottom-full right-0 transform translate-x-0 mb-2 px-2 py-1 bg-[#2A2A2A] text-[#E8E8E8] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                History
                <div className="absolute top-full right-4 transform translate-x-0 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-[#2A2A2A]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-[#F8F8F8] border border-[#B8B8B8] text-[#1A1A1A] px-4 py-2 rounded-lg shadow-lg z-50" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
          Saved to Heijo Cloud
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



