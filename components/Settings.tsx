'use client';

import { useState, useEffect } from 'react';
import { gdprManager, ConsentSettings, PrivacyMetrics } from '@/lib/gdpr';
import { analyticsCollector } from '@/lib/analytics';
import AnalyticsDashboard from './AnalyticsDashboard';
import { checkPremiumStatus, activatePremium, deactivatePremium } from '@/lib/premium';
import { useAuth } from '@/lib/auth';
import { storage } from '@/lib/store';
import NotificationSettings from './NotificationSettings';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onExportCSV?: () => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

export default function Settings({ isOpen, onClose, onExportCSV, fontSize, setFontSize }: SettingsProps) {
  const [consent, setConsent] = useState<ConsentSettings | null>(null);
  const [metrics, setMetrics] = useState<PrivacyMetrics | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoadingPremium, setIsLoadingPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const consentData = gdprManager.getConsentSettings();
    
    // Use main storage system (user-scoped) instead of secureStorage for metrics
    // This ensures each user only sees their own entry count
    const entries = await storage.getEntries();
    const totalSize = JSON.stringify(entries).length;
    const sortedEntries = entries.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const metricsData = {
      totalEntries: entries.length,
      totalSize,
      oldestEntry: sortedEntries.length > 0 ? new Date(sortedEntries[0].created_at) : undefined,
      newestEntry: sortedEntries.length > 0 ? new Date(sortedEntries[sortedEntries.length - 1].created_at) : undefined,
      consentGiven: consentData.dataStorage,
      dataRetentionDays: 365
    };
    
    setConsent(consentData);
    setMetrics(metricsData);
    
    // Load premium status
    const premiumStatus = await checkPremiumStatus();
    setIsPremium(premiumStatus.isPremium);
  };

  const handleConsentChange = (key: keyof ConsentSettings, value: boolean) => {
    if (!consent) return;
    
    const updatedConsent = { ...consent, [key]: value };
    setConsent(updatedConsent);
    gdprManager.updateConsent(updatedConsent);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Track analytics
      analyticsCollector.trackEvent('export_data');
      
      if (onExportCSV) {
        await onExportCSV();
      } else {
        const { exportEntriesAsCSV } = await import('@/lib/csvExport');
        const entries = await storage.exportEntries();
        exportEntriesAsCSV(entries);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePremiumToggle = async (enabled: boolean) => {
    if (enabled) {
      // User wants to enable premium
      if (!isPremium) {
        // Show upgrade modal
        setShowUpgradeModal(true);
      } else {
        // Already premium, enable sync
        setShowSyncConfirm(true);
      }
    } else {
      // User wants to disable premium - show warning
      const confirmed = window.confirm(
        'You have 24 hours to export your data. Access to cloud storage will be revoked after that. Do you want to continue?'
      );
      if (!confirmed) return;

      setIsLoadingPremium(true);
      const { error } = await deactivatePremium();
      if (error) {
        console.error('Failed to deactivate premium:', error);
        alert('Failed to deactivate premium. Please try again.');
      } else {
        setIsPremium(false);
        // Update consent to enable local storage when premium is disabled
        if (consent) {
          handleConsentChange('dataStorage', true);
        }
      }
      setIsLoadingPremium(false);
    }
  };

  const handleUpgradeConfirm = async () => {
    setIsLoadingPremium(true);
    setShowUpgradeModal(false);
    
    // TODO: Future Development - Replace with actual payment API
    // For now, activate premium for free (testing only)
    const { error } = await activatePremium();
    if (error) {
      console.error('Failed to activate premium:', error);
      alert('Failed to activate premium. Please try again.');
      setIsLoadingPremium(false);
    } else {
      setIsPremium(true);
      // Disable local storage when premium is enabled
      if (consent) {
        handleConsentChange('dataStorage', false);
      }
      setIsLoadingPremium(false);
      // Show sync confirmation
      setShowSyncConfirm(true);
    }
  };

  const handleSyncConfirm = async (shouldSync: boolean) => {
    setShowSyncConfirm(false);
    
    if (shouldSync) {
      setIsSyncing(true);
      try {
        // Sync all local entries to Supabase
        await storage.syncLocalEntries();
        alert('Your entries have been synced to the cloud!');
      } catch (error) {
        console.error('Failed to sync entries:', error);
        alert('Failed to sync entries. They will sync automatically as you create new entries.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleLocalStorageToggle = (enabled: boolean) => {
    if (enabled && isPremium) {
      // Can't enable local storage when premium is active
      alert('Please disable Premium Cloud Sync first to use Local Data Storage.');
      return;
    }
    handleConsentChange('dataStorage', enabled);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Track analytics
      analyticsCollector.trackEvent('delete_entry');
      
      await gdprManager.deleteAllData();
      setShowDeleteConfirm(false);
      onClose();
      // Reload the page to reset the app state
      window.location.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen || !consent || !metrics) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70" style={{ paddingTop: 'env(safe-area-inset-top, 0)', paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
      <div className="flex h-full w-full items-end md:items-center justify-center px-3 py-4 md:px-6">
        <div className="settings-sheet w-full max-w-3xl h-[96vh] md:h-[90vh] overflow-hidden flex flex-col bg-white" style={{ maxHeight: 'calc(100vh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0))' }}>
          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b settings-divider bg-white/95 px-4 sm:px-5 py-3 sm:py-4">
            <h2 className="text-lg font-semibold tracking-[0.08em] uppercase text-[#2a2a2a] leading-tight">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="ghost-chip rounded-full px-3 py-2 text-xs tracking-[0.18em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="Close settings"
            >
              Close
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 md:px-8 py-4 sm:py-5 space-y-5 sm:space-y-6 pb-20 sm:pb-24" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0))' }}>
            {/* Data overview */}
            <section className="space-y-3 border-b settings-divider pb-5">
              <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-[#5a5a5a]">
                Your Data
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between border border-[#eeeeee] rounded-lg px-3 py-2">
                  <span className="text-text-secondary">Total Entries</span>
                  <span className="text-[#1a1a1a] font-semibold">{metrics.totalEntries}</span>
                </div>
                <div className="flex items-center justify-between border border-[#eeeeee] rounded-lg px-3 py-2">
                  <span className="text-text-secondary">Storage Used</span>
                  <span className="text-[#1a1a1a] font-semibold">{formatBytes(metrics.totalSize)}</span>
                </div>
                {metrics.oldestEntry && (
                  <div className="flex items-center justify-between border border-[#eeeeee] rounded-lg px-3 py-2">
                    <span className="text-text-secondary">Oldest Entry</span>
                    <span className="text-[#1a1a1a] font-semibold">{metrics.oldestEntry.toLocaleDateString()}</span>
                  </div>
                )}
                {metrics.newestEntry && (
                  <div className="flex items-center justify-between border border-[#eeeeee] rounded-lg px-3 py-2">
                    <span className="text-text-secondary">Newest Entry</span>
                    <span className="text-[#1a1a1a] font-semibold">{metrics.newestEntry.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Consent settings */}
            <section className="space-y-4 border-b settings-divider pb-5">
              <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-[#5a5a5a]">
                Consent Settings
              </h3>
              {[
                {
                  title: 'Microphone Access',
                  description: 'Required for voice recording',
                  checked: consent.microphone,
                  onChange: (checked: boolean) => handleConsentChange('microphone', checked),
                  disabled: false,
                },
                {
                  title: 'Local Data Storage',
                  description: 'Store encrypted copies on this device',
                  checked: consent.dataStorage && !isPremium,
                  onChange: (checked: boolean) => handleLocalStorageToggle(checked),
                  disabled: isPremium,
                },
                {
                  title: 'Premium Cloud Sync',
                  description: isPremium ? 'Premium: Active' : 'Sync across devices',
                  checked: isPremium,
                  onChange: (checked: boolean) => handlePremiumToggle(checked),
                  disabled: isLoadingPremium,
                },
                {
                  title: 'Analytics (Optional)',
                  description: 'Share anonymous usage patterns',
                  checked: consent.analytics,
                  onChange: (checked: boolean) => handleConsentChange('analytics', checked),
                  disabled: false,
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1a1a1a]">{item.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{item.description}</p>
                  </div>
                  <label className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full ${item.disabled ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      disabled={item.disabled}
                    />
                    <span className="absolute inset-0 rounded-full bg-[#e6e6e6] transition peer-checked:bg-[#1a1a1a]"></span>
                    <span className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
                  </label>
                </div>
              ))}
            </section>

            {/* Analytics Dashboard */}
            <AnalyticsDashboard isVisible={consent?.analytics === true} />

            {/* Display settings */}
            <section className="space-y-3 border-b settings-divider pb-5">
              <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-[#5a5a5a]">
                Display
              </h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1a1a1a]">Font Size</p>
                <div className="flex items-center gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`w-9 h-9 rounded-lg border text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        fontSize === size
                          ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-lg'
                          : 'bg-white text-[#1a1a1a] border-[#d9d9d9] hover:border-[#1a1a1a]'
                      }`}
                    >
                      {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-secondary">
                  Adjust reading comfort without changing layout.
                </p>
              </div>
            </section>

            {/* Notifications */}
            <section className="space-y-3 border-b settings-divider pb-5">
              <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-[#5a5a5a]">
                Notifications
              </h3>
              <NotificationSettings />
            </section>

            {/* Export */}
            <section className="space-y-3 border-b settings-divider pb-5">
              <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-[#5a5a5a]">
                Export
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting || metrics.totalEntries === 0}
                  className="px-4 py-2 text-sm font-medium silver-button text-graphite-charcoal rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting…' : 'Export as CSV'}
                </button>
              </div>
              <p className="text-xs text-text-caption">
                Includes entry text, tags, and timestamps.
              </p>
            </section>

            {/* Delete data */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold tracking-[0.14em] uppercase text-[#5a5a5a]">
                Delete All Data
              </h3>
              <p className="text-xs text-text-secondary">
                Permanently removes every journal entry, tag, and preference. This cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={metrics.totalEntries === 0}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-[#c62828] shadow-[0_6px_18px_rgba(198,40,40,0.35)] hover:bg-[#b02121] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete All Data
              </button>
            </section>

            {/* Legal */}
            <section className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-4 text-xs text-text-caption">
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/privacy';
                  }}
                  className="hover:text-graphite-charcoal underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </button>
                <span aria-hidden="true">•</span>
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/terms';
                  }}
                  className="hover:text-graphite-charcoal underline-offset-4 hover:underline"
                >
                  Terms of Service
                </button>
              </div>
              <div className="text-[10px] text-text-caption leading-snug">
                <div className="brand-hero uppercase tracking-[0.2em]">Heijō mini-journal</div>
                <div>Micro-moments. Macro-clarity.</div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-graphite-charcoal bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-mist-white border border-soft-silver rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-graphite-charcoal mb-4 subheading">Confirm Deletion</h3>
            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to delete all your data? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium outline-button rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-graphite-charcoal bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-mist-white border border-soft-silver rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-graphite-charcoal mb-4 subheading">Upgrade to Premium</h3>
            <p className="text-sm text-text-secondary mb-4">
              Premium Cloud Sync enables:
            </p>
            <ul className="text-sm text-text-secondary mb-6 space-y-2 list-disc list-inside">
              <li>Sync across all your devices</li>
              <li>Cloud backup and restore</li>
              <li>Access your journal anywhere</li>
            </ul>
            <p className="text-xs text-text-caption mb-6">
              {/* TODO: Future Development - Replace with actual payment API (Chrome Web Store / App Store) */}
              For testing: Premium is currently free. Payment integration coming soon.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 text-sm font-medium outline-button rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgradeConfirm}
                disabled={isLoadingPremium}
                className="px-4 py-2 text-sm font-medium bg-graphite-charcoal text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg"
              >
                {isLoadingPremium ? 'Activating...' : 'Activate Premium'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Confirmation Modal */}
      {showSyncConfirm && (
        <div className="fixed inset-0 bg-graphite-charcoal bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-mist-white border border-soft-silver rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-graphite-charcoal mb-4 subheading">Sync Your Entries?</h3>
            <p className="text-sm text-text-secondary mb-6">
              Would you like to sync your existing {metrics?.totalEntries || 0} entries to the cloud? This will enable access across all your devices.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleSyncConfirm(false)}
                className="px-4 py-2 text-sm font-medium outline-button rounded-lg"
              >
                Skip
              </button>
              <button
                onClick={() => handleSyncConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-graphite-charcoal rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSyncConfirm(true)}
                disabled={isSyncing}
                className="px-4 py-2 text-sm font-medium bg-graphite-charcoal text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
