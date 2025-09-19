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
import PrivacySettings from '@/components/PrivacySettings';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{ id: string; text: string } | null>(null);
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
          setShowPrivacySettings(true);
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
      throw error; // Re-throw for Composer to handle
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
    <div className="h-screen bg-[#EFEFEF] p-2 sm:p-4 overflow-hidden">
      <div className="max-w-4xl lg:max-w-6xl mx-auto h-full flex flex-col">
        {/* Main Journal Panel - Nintendo/PalmPilot gray outer shell */}
        <div className="bg-[#D8D8D8] rounded-lg border-2 border-[#B8B8B8] p-3 sm:p-4 lg:p-6 shadow-[0_0_25px_rgba(184,184,184,0.2)] relative flex-1 flex flex-col">
          {/* Header inside journal panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-[#C7C7C7] flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <div className="relative group">
                <h1 className="text-xl font-semibold text-[#1A1A1A] relative" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
                  <span className="bg-gradient-to-r from-[#1A1A1A] via-[#4A4A4A] to-[#1A1A1A] bg-clip-text text-transparent">
                    Heijō
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8E8E8] to-transparent opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-100"></div>
                </h1>
                <div className="flex items-center gap-2 -mt-1">
                  <div className="text-sm font-medium text-[#6A6A6A]" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
                    Mini-Journal
                  </div>
                  <span className="text-xs text-[#6A6A6A] font-medium italic" style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
                    beta
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={() => setShowPrivacySettings(true)}
                className="text-sm text-[#6A6A6A] hover:text-[#1A1A1A] transition-colors duration-100"
                style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
              >
                Privacy
              </button>
              <button
                onClick={signOut}
                className="text-sm text-[#6A6A6A] hover:text-[#1A1A1A] transition-colors duration-100"
                style={{ fontFamily: '"Indie Flower", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}
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
      <PrivacySettings
        isOpen={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
      />
    </div>
  );
}



