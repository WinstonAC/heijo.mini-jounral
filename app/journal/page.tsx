'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Composer from '@/components/Composer';
import EntryList from '@/components/EntryList';
import RecentEntriesDrawer from '@/components/RecentEntriesDrawer';
import { storage, JournalEntry } from '@/lib/store';
import { gdprManager } from '@/lib/gdpr';
import { performanceMonitor } from '@/lib/performance';
import { rateLimiter } from '@/lib/rateLimiter';
import { useAuth } from '@/lib/auth';
import { analyticsCollector } from '@/lib/analytics';
import Settings from '@/components/Settings';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{ id: string; text: string } | null>(null);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [manualSaveFn, setManualSaveFn] = useState<(() => Promise<void>) | null>(null);
  const [saveState, setSaveState] = useState<{ isSaving: boolean; isSaved: boolean; error: string | null }>({ isSaving: false, isSaved: false, error: null });
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const initializeApp = async () => {
      if (user) {
        // Initialize performance monitoring
        await performanceMonitor.initialize();
        
        // Initialize analytics
        await analyticsCollector.initialize();
        
        // Initialize rate limiting
        await rateLimiter.initialize();
        
        // Reset rate limiter in development if it's blocking (for testing)
        if (process.env.NODE_ENV === 'development') {
          const check = await rateLimiter.isAllowed();
          if (!check.allowed) {
            console.warn('[Dev] Rate limiter is blocking, resetting for development...');
            await rateLimiter.reset();
          }
        }
        
        // GDPR consent check removed - local-first app, no consent blocking needed
        // Users can still access Settings manually to configure preferences
        
        loadEntries();
        
        // Sync local entries on app boot
        storage.syncLocalEntries().catch(error => {
          console.warn('Failed to sync local entries:', error);
        });
        
        // Welcome overlay is now handled inside Composer component
        // No modal logic needed here
      }
    };

    initializeApp();
  }, [user]);

  const loadEntries = async () => {
    try {
      const loadedEntries = await storage.getEntries();
      setEntries(loadedEntries);
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async (entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'>) => {
    // Check rate limiting first
    const rateLimitCheck = await rateLimiter.isAllowed();
    if (!rateLimitCheck.allowed) {
      const errorMessage = rateLimitCheck.reason || 'Rate limit exceeded, please try again later';
      const error = new Error(errorMessage);
      // Add retryAfter to error for UI display
      if (rateLimitCheck.retryAfter) {
        (error as any).retryAfter = rateLimitCheck.retryAfter;
      }
      throw error;
    }

    let savedEntry: JournalEntry;
    let syncError: Error | null = null;

    try {
      // Always use regular storage (localStorage) for consistency
      // secureStorage uses IndexedDB which is separate from localStorage
      // This ensures entries are always accessible via localStorage
      savedEntry = await storage.saveEntry(entry);
    } catch (error) {
      // If local save fails, we can't proceed - this is a critical error
      console.error('Failed to save entry locally:', error);
      throw error;
    }

    // Always update UI state immediately after local save succeeds
    // This ensures entries appear in drawer and composer clears even if cloud sync fails
    setEntries(prev => [savedEntry, ...prev]);
    
    // Track analytics
    if (entry.source === 'voice') {
      analyticsCollector.trackEvent('voice_recording_complete', {
        length: entry.content.length,
        latency: performance.now() // This would be more accurate with actual latency
      });
    } else {
      analyticsCollector.trackEvent('text_entry_save', {
        length: entry.content.length
      });
    }

    // Cloud sync happens in background - errors don't block UI updates
    // The entry is already saved locally and UI is already updated
    // If sync fails, entry will have sync_status: 'local_only' or 'sync_failed'
    // which is handled gracefully by the storage layer
    
    return savedEntry;
  }, []); // Empty deps array since handleSave doesn't depend on any props/state

  const handleEntryClick = (entry: JournalEntry) => {
    // Navigate to entry detail page
    window.location.href = `/entry/${entry.id}`;
  };

  const handleDelete = async (id: string) => {
    try {
      await storage.deleteEntry(id);
      setEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry. Please try again.');
    }
  };

  const handleExport = async () => {
    try {
      const allEntries = await storage.exportEntries();
      const { exportEntriesAsCSV } = await import('@/lib/csvExport');
      exportEntriesAsCSV(allEntries);
    } catch (error) {
      console.error('Failed to export entries:', error);
      alert('Failed to export entries. Please try again.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-2xl w-full mx-auto">
        <div className="bg-[var(--ui-screen)] rounded-lg card-border p-8">
          <div className="text-center text-[var(--ui-graphite)]">
            <p>Loading your journal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <>
    <div className="min-h-screen flex flex-col items-center px-2 sm:px-5 py-4 sm:py-14 md:py-16 safe-area-bottom overflow-y-auto" style={{ background: 'linear-gradient(180deg, #f5f5f5 0%, #f0f0f0 100%)' }}>
      <div className="w-full max-w-[420px] min-w-[360px] sm:max-w-[420px] sm:min-w-[360px] md:max-w-[960px] md:min-w-[640px] lg:max-w-[960px] lg:min-w-[640px] mx-auto flex flex-col flex-1 mt-6 md:mt-10 pb-4 md:pb-0">
        {/* Main Journal Panel */}
        <div className="brutalist-card relative min-h-[72vh] md:h-auto md:flex-1 flex flex-col bg-[#fefefe] rounded-[18px] px-4 sm:px-6 lg:px-8 py-4 pb-4 sm:py-6 gap-4">
          {/* Header inside journal panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ececec] flex-shrink-0">
            <div className="flex flex-col gap-1">
              <div className="relative group">
                <h1 className="text-2xl sm:text-3xl tracking-tight leading-tight text-graphite-charcoal">
                  <span className="brand-hero leading-[1.1]">Heijō</span>
                  <span className="brand-label text-text-secondary ml-2 sm:ml-3 leading-[1.2]">mini-journal</span>
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-text-secondary font-medium subheading leading-tight">
                    Micro-moments. Macro-clarity.
                  </span>
                  <span className="text-[10px] tracking-[0.2em] text-text-caption font-semibold px-3 py-1 border border-[#d8d8d8] rounded-full uppercase leading-tight">
                    beta
                  </span>
                </div>
              </div>
            </div>
            {/* Desktop-only Settings/Sign Out */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs tracking-[0.18em] uppercase text-text-caption hover:text-graphite-charcoal transition-colors duration-300 py-2 px-3 rounded-md hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Settings
              </button>
              <button
                onClick={signOut}
                className="text-xs tracking-[0.18em] uppercase text-text-caption hover:text-graphite-charcoal transition-colors duration-300 py-2 px-3 rounded-md hover:bg-[#f4f4f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <Composer 
              onSave={handleSave} 
              onExport={handleExport} 
              selectedPrompt={selectedPrompt}
              userId={user.id}
              fontSize={fontSize}
              setFontSize={setFontSize}
              entryCount={entries.length}
              onManualSaveReady={setManualSaveFn}
              onSaveStateChange={setSaveState}
            />
          </div>

          {/* Mobile Bottom Pill Nav - inside card on mobile */}
          <div className="sm:hidden mt-8 pb-8 flex justify-center" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
            <div 
              className="w-full max-w-[calc(100%-2rem)] rounded-full bg-white/80 backdrop-blur-md flex items-center justify-between px-4 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              {/* Left cluster: Save, History */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (manualSaveFn && typeof manualSaveFn === 'function') {
                      try {
                        await manualSaveFn();
                      } catch (error) {
                        console.error('Manual save failed:', error);
                      }
                    } else {
                      // Fallback: dispatch event
                      const event = new CustomEvent('mobileSave');
                      window.dispatchEvent(event);
                    }
                  }}
                  disabled={!manualSaveFn || typeof manualSaveFn !== 'function' || saveState.isSaving}
                  className="px-3 py-2 rounded-full text-sm font-medium tracking-[0.08em] text-[#4a4a4a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveState.isSaving ? 'Saving...' : saveState.isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    const event = new CustomEvent('openJournalHistory');
                    window.dispatchEvent(event);
                  }}
                  className="px-3 py-2 rounded-full text-sm font-medium tracking-[0.08em] text-[#4a4a4a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  History
                </button>
              </div>

              {/* Right cluster: Settings, Sign Out */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-3 py-2 rounded-full text-sm font-medium tracking-[0.08em] text-[#4a4a4a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  Settings
                </button>
                <button
                  onClick={signOut}
                  className="px-3 py-2 rounded-full text-sm font-medium tracking-[0.08em] text-[#4a4a4a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Entries Drawer */}
      <RecentEntriesDrawer
        entries={entries}
        onEntryClick={handleEntryClick}
        onExportAll={handleExport}
        onDelete={handleDelete}
      />


      {/* Privacy Settings modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onExportCSV={handleExport}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />
    </div>

    </>
  );
}



