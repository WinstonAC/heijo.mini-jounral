'use client';

import { useState, useEffect } from 'react';
import { gdprManager, ConsentSettings, PrivacyMetrics } from '@/lib/gdpr';
import { analyticsCollector } from '@/lib/analytics';
import AnalyticsDashboard from './AnalyticsDashboard';

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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const consentData = gdprManager.getConsentSettings();
    const metricsData = await gdprManager.getPrivacyMetrics();
    setConsent(consentData);
    setMetrics(metricsData);
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
        await gdprManager.exportAsCSV();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
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
                    checked={consent.dataStorage}
                    onChange={(e) => handleConsentChange('dataStorage', e.target.checked)}
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

          {/* Privacy Policy Link */}
          <div className="text-center">
            <a
              href="/privacy"
              className="text-xs text-text-caption hover:text-graphite-charcoal transition-colors"
            >
              View Privacy Policy
            </a>
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
    </div>
  );
}
