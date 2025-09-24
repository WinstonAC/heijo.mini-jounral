'use client';

import { useState, useEffect } from 'react';
import { gdprManager, ConsentSettings, PrivacyMetrics } from '@/lib/gdpr';

interface PrivacySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacySettings({ isOpen, onClose }: PrivacySettingsProps) {
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
      await gdprManager.exportAsCSV();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F8F8F8] border border-[#C7C7C7] rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-light text-[#1A1A1A]">Privacy & Data Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#B8B8B8] flex items-center justify-center text-[#6A6A6A] hover:bg-[#F0F0F0] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Data Overview */}
          <div className="mb-6 p-4 bg-[#F0F0F0] rounded-lg">
            <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Your Data</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#6A6A6A]">Total Entries:</span>
                <span className="ml-2 font-medium">{metrics.totalEntries}</span>
              </div>
              <div>
                <span className="text-[#6A6A6A]">Storage Used:</span>
                <span className="ml-2 font-medium">{formatBytes(metrics.totalSize)}</span>
              </div>
              {metrics.oldestEntry && (
                <div>
                  <span className="text-[#6A6A6A]">Oldest Entry:</span>
                  <span className="ml-2 font-medium">{metrics.oldestEntry.toLocaleDateString()}</span>
                </div>
              )}
              {metrics.newestEntry && (
                <div>
                  <span className="text-[#6A6A6A]">Newest Entry:</span>
                  <span className="ml-2 font-medium">{metrics.newestEntry.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Consent Settings */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#1A1A1A] mb-4">Consent Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Microphone Access</div>
                  <div className="text-xs text-[#6A6A6A]">Required for voice recording</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.microphone}
                    onChange={(e) => handleConsentChange('microphone', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Local Data Storage</div>
                  <div className="text-xs text-[#6A6A6A]">Store your journal entries locally with encryption</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.dataStorage}
                    onChange={(e) => handleConsentChange('dataStorage', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Analytics (Optional)</div>
                  <div className="text-xs text-[#6A6A6A]">Help improve the app with anonymous usage data</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data Export */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#1A1A1A] mb-4">Export Your Data</h3>
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                disabled={isExporting || metrics.totalEntries === 0}
                className="px-4 py-2 text-sm font-light border border-[#B8B8B8] text-[#6A6A6A] hover:bg-[#F0F0F0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded"
              >
                {isExporting ? 'Exporting...' : 'Export as CSV'}
              </button>
            </div>
          </div>

          {/* Data Deletion */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#1A1A1A] mb-4">Delete All Data</h3>
            <p className="text-xs text-[#6A6A6A] mb-4">
              This will permanently delete all your journal entries and settings. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={metrics.totalEntries === 0}
              className="px-4 py-2 text-sm font-light bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded"
            >
              Delete All Data
            </button>
          </div>

          {/* Privacy Policy Link */}
          <div className="text-center">
            <a
              href="/privacy"
              className="text-xs text-[#6A6A6A] hover:text-[#1A1A1A] transition-colors"
            >
              View Privacy Policy
            </a>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-[#F8F8F8] border border-[#C7C7C7] rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Confirm Deletion</h3>
            <p className="text-sm text-[#6A6A6A] mb-6">
              Are you sure you want to delete all your data? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-light border border-[#B8B8B8] text-[#6A6A6A] hover:bg-[#F0F0F0] transition-colors duration-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-light bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded"
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





