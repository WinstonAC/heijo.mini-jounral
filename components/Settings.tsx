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
    <div className="fixed inset-0 bg-graphite-charcoal bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-mist-white border border-soft-silver rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-graphite-charcoal subheading">Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-soft-silver flex items-center justify-center text-text-secondary hover:bg-tactile-taupe transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Data Overview */}
          <div className="mb-6 p-4 bg-tactile-taupe rounded-lg">
            <h3 className="text-sm font-medium text-graphite-charcoal mb-3 subheading">Your Data</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Total Entries:</span>
                <span className="ml-2 font-medium text-graphite-charcoal">{metrics.totalEntries}</span>
              </div>
              <div>
                <span className="text-text-secondary">Storage Used:</span>
                <span className="ml-2 font-medium text-graphite-charcoal">{formatBytes(metrics.totalSize)}</span>
              </div>
              {metrics.oldestEntry && (
                <div>
                  <span className="text-text-secondary">Oldest Entry:</span>
                  <span className="ml-2 font-medium text-graphite-charcoal">{metrics.oldestEntry.toLocaleDateString()}</span>
                </div>
              )}
              {metrics.newestEntry && (
                <div>
                  <span className="text-text-secondary">Newest Entry:</span>
                  <span className="ml-2 font-medium text-graphite-charcoal">{metrics.newestEntry.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Consent Settings */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-graphite-charcoal mb-4 subheading">Consent Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-graphite-charcoal">Microphone Access</div>
                  <div className="text-xs text-text-secondary">Required for voice recording</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.microphone}
                    onChange={(e) => handleConsentChange('microphone', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-graphite-charcoal">Local Data Storage</div>
                  <div className="text-xs text-text-secondary">Store your journal entries locally with encryption</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.dataStorage && !isPremium}
                    onChange={(e) => handleLocalStorageToggle(e.target.checked)}
                    disabled={isPremium}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal ${isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-graphite-charcoal">Premium Cloud Sync</div>
                  <div className="text-xs text-text-secondary">
                    {isPremium ? 'Premium: Active' : 'Sync across all your devices'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => handlePremiumToggle(e.target.checked)}
                    disabled={isLoadingPremium}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-graphite-charcoal">Analytics (Optional)</div>
                  <div className="text-xs text-text-secondary">Help improve the app with anonymous usage data</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Analytics Dashboard - Only show if analytics consent is given */}
          <AnalyticsDashboard isVisible={consent?.analytics === true} />

          {/* Display Settings */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-graphite-charcoal mb-4 subheading">Display Settings</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-graphite-charcoal mb-3">Font Size</div>
                <div className="flex items-center gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`w-8 h-8 rounded-lg border transition-all duration-300 flex items-center justify-center text-xs font-medium focus:outline-none focus:ring-2 focus:ring-soft-silver focus:ring-opacity-50 ${
                        fontSize === size
                          ? 'bg-graphite-charcoal border-graphite-charcoal text-text-inverse shadow-lg'
                          : 'bg-white border-soft-silver text-graphite-charcoal hover:bg-tactile-taupe hover:border-graphite-charcoal hover:shadow-md'
                      }`}
                    >
                      {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  Adjust the font size for your journal entries
                </p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="mb-6 border-t border-ui-warm-silver pt-6">
            <NotificationSettings />
          </div>

          {/* Data Export */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-graphite-charcoal mb-4 subheading">Export Your Data</h3>
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                disabled={isExporting || metrics.totalEntries === 0}
                className="px-4 py-2 text-sm font-medium silver-button text-graphite-charcoal disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-lg"
              >
                {isExporting ? 'Exporting...' : 'Export as CSV'}
              </button>
            </div>
            <p className="text-xs text-text-caption mt-2">
              Export your journal entries with date, time, and text content.
            </p>
          </div>

          {/* Data Deletion */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-graphite-charcoal mb-4 subheading">Delete All Data</h3>
            <p className="text-xs text-text-secondary mb-4">
              This will permanently delete all your journal entries and settings. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={metrics.totalEntries === 0}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg"
            >
              Delete All Data
            </button>
          </div>

          {/* Legal Links */}
          <div className="text-center flex items-center justify-center gap-4">
            <button
              onClick={() => {
                onClose();
                window.location.href = '/privacy';
              }}
              className="text-xs text-text-caption hover:text-graphite-charcoal transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-soft-silver">•</span>
            <button
              onClick={() => {
                onClose();
                window.location.href = '/terms';
              }}
              className="text-xs text-text-caption hover:text-graphite-charcoal transition-colors"
            >
              Terms of Service
            </button>
          </div>

          {/* Branding */}
          <div className="mt-6 pt-6 border-t border-soft-silver text-center">
            <div className="text-[10px] text-text-caption caption-text">
              <div className="brand-hero">Heijō mini-journal</div>
              <div className="mt-1">Micro-moments. Macro-clarity.</div>
            </div>
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
