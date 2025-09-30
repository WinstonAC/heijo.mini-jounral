'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Composer from '@/components/Composer';
import EntryList from '@/components/EntryList';
import RecentEntriesDrawer from '@/components/RecentEntriesDrawer';
import OnboardingModal from '@/components/OnboardingModal';
import { storage, JournalEntry } from '@/lib/store';
import { secureStorage } from '@/lib/secureStorage';
import { gdprManager } from '@/lib/gdpr';
import { performanceMonitor } from '@/lib/performance';
import { rateLimiter } from '@/lib/rateLimiter';
import { useAuth } from '@/lib/auth';
import Settings from '@/components/Settings';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
        
        // Initialize rate limiting
        await rateLimiter.initialize();
        
        // Check GDPR consent
        const hasConsent = gdprManager.hasDataStorageConsent();
        if (!hasConsent) {
          setShowSettings(true);
        }
        
        loadEntries();
        
        // Sync local entries on app boot
        storage.syncLocalEntries().catch(error => {
          console.warn('Failed to sync local entries:', error);
        });
        
        // Check if this is the first visit
        const hasVisited = localStorage.getItem('heijo-has-visited');
        if (!hasVisited) {
          setShowOnboarding(true);
          localStorage.setItem('heijo-has-visited', 'true');
        }
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

      // Use secure storage if consent is given
      const hasConsent = gdprManager.hasDataStorageConsent();
      const savedEntry = hasConsent 
        ? await secureStorage.saveEntry(entry)
        : await storage.saveEntry(entry);
      
      setEntries(prev => [savedEntry, ...prev]);
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
          last_synced: null
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
      const dataStr = JSON.stringify(allEntries, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `heijo-journal-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
    <div className="h-screen bg-mist-white p-2 sm:p-4 lg:p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Main Journal Panel - Clean white container */}
        <div className="bg-white rounded-xl border border-soft-silver p-3 sm:p-4 lg:p-6 shadow-lg relative flex-1 flex flex-col">
          {/* Header inside journal panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-soft-silver flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <div className="relative group">
                <h1 className="text-xl sm:text-2xl lg:text-3xl brand-hero text-graphite-charcoal relative">
                  <span className="brand-hero">Heijō</span>
                  <span className="brand-label text-text-secondary ml-1 sm:ml-2">mini-journal</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-secondary font-medium subheading">
                    Micro-moments. Macro-clarity.
                  </span>
                  <span className="text-xs text-text-caption font-medium px-2 py-1 bg-tactile-taupe rounded-full caption-text">
                    beta
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-text-caption hover:text-graphite-charcoal transition-colors duration-300 py-1 px-2 rounded-lg hover:bg-tactile-taupe caption-text"
              >
                Settings
              </button>
              <button
                onClick={signOut}
                className="text-xs text-text-caption hover:text-graphite-charcoal transition-colors duration-300 py-1 px-2 rounded-lg hover:bg-tactile-taupe caption-text"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <Composer 
              onSave={handleSave} 
              onExport={handleExport} 
              selectedPrompt={selectedPrompt}
              userId={user.id}
              fontSize={fontSize}
              setFontSize={setFontSize}
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

      {/* Onboarding modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
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



