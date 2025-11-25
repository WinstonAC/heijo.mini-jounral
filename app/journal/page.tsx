'use client';

import { useState, useEffect } from 'react';
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

  const handleSave = async (entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'>) => {
    try {
      // Check rate limiting
      const rateLimitCheck = await rateLimiter.isAllowed();
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason || 'Rate limit exceeded');
      }

      // Always use regular storage (localStorage) for consistency
      // secureStorage uses IndexedDB which is separate from localStorage
      // This ensures entries are always accessible via localStorage
      const savedEntry = await storage.saveEntry(entry);
      
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
      
      return savedEntry;
    } catch (error) {
      console.error('Failed to save entry:', error);
      
      // Check if it's a Supabase conflict error
      if (error instanceof Error && error.message.includes('409')) {
        console.warn('Mic transcription ready, but Supabase save failed: [409 conflict]', error);
        // Don't throw - let the user continue with their transcription
        // The entry is still saved locally
        return {
          id: `local-${Date.now()}`,
          ...entry,
          sync_status: 'failed' as const,
          last_synced: undefined
        };
      }
      
      throw error; // Re-throw for other errors
    }
  };

  const handleEntryClick = (entry: JournalEntry) => {
    // Navigate to entry detail page
    window.location.href = `/entry/${entry.id}`;
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
    <div className="min-h-screen bg-[#f2f2f2] px-3 sm:px-5 py-4 safe-area-bottom overflow-y-auto">
      <div className="mx-auto w-full max-w-[420px] sm:max-w-3xl lg:max-w-5xl flex flex-col flex-1">
        {/* Main Journal Panel */}
        <div className="brutalist-card relative flex-1 flex flex-col bg-white/95 rounded-[14px] border border-[#e5e5e5] shadow-[0_4px_12px_rgba(0,0,0,0.06)] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4">
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
            <div className="flex items-center gap-2 self-end sm:self-auto">
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
          
          <div className="flex-1 overflow-y-auto">
            <Composer 
              onSave={handleSave} 
              onExport={handleExport} 
              selectedPrompt={selectedPrompt}
              userId={user.id}
              fontSize={fontSize}
              setFontSize={setFontSize}
              entryCount={entries.length}
            />
          </div>
        </div>
      </div>

      {/* Recent Entries Drawer */}
      <RecentEntriesDrawer
        entries={entries}
        onEntryClick={handleEntryClick}
        onExportAll={handleExport}
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
  );
}



