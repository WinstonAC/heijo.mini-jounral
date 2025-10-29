/**
 * GDPR compliance utilities for Heijo
 * Implements data export, deletion, and consent management
 */

import { JournalEntry } from './store';
import { secureStorage } from './secureStorage';

export interface ConsentSettings {
  microphone: boolean;
  dataStorage: boolean;
  analytics: boolean;
  lastUpdated: string;
  version: string;
}

export interface DataExport {
  entries: JournalEntry[];
  settings: ConsentSettings;
  exportDate: string;
  version: string;
  totalEntries: number;
  totalSize: number; // in bytes
}

export interface PrivacyMetrics {
  totalEntries: number;
  totalSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  consentGiven: boolean;
  dataRetentionDays: number;
}

class GDPRManager {
  private static instance: GDPRManager;
  private readonly CONSENT_KEY = 'heijo-consent-settings';
  private readonly VERSION = '1.0.0';

  private constructor() {}

  static getInstance(): GDPRManager {
    if (!GDPRManager.instance) {
      GDPRManager.instance = new GDPRManager();
    }
    return GDPRManager.instance;
  }

  /**
   * Get current consent settings
   */
  getConsentSettings(): ConsentSettings {
    if (typeof window === 'undefined') {
      return this.getDefaultConsent();
    }

    try {
      const stored = localStorage.getItem(this.CONSENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...this.getDefaultConsent(),
          ...parsed,
          version: this.VERSION
        };
      }
    } catch (error) {
      console.warn('Failed to load consent settings:', error);
    }

    return this.getDefaultConsent();
  }

  /**
   * Update consent settings
   */
  updateConsent(settings: Partial<ConsentSettings>): void {
    if (typeof window === 'undefined') return;

    const currentSettings = this.getConsentSettings();
    const updatedSettings: ConsentSettings = {
      ...currentSettings,
      ...settings,
      lastUpdated: new Date().toISOString(),
      version: this.VERSION
    };

    try {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save consent settings:', error);
    }
  }

  /**
   * Check if user has given consent for microphone
   */
  hasMicrophoneConsent(): boolean {
    return this.getConsentSettings().microphone;
  }

  /**
   * Check if user has given consent for data storage
   */
  hasDataStorageConsent(): boolean {
    return this.getConsentSettings().dataStorage;
  }

  /**
   * Request microphone consent
   */
  async requestMicrophoneConsent(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      this.updateConsent({ microphone: true });
      return true;
    } catch (error) {
      console.warn('Microphone consent denied:', error);
      this.updateConsent({ microphone: false });
      return false;
    }
  }

  /**
   * Export all user data
   */
  async exportAllData(): Promise<DataExport> {
    const entries = await secureStorage.getEntries();
    const settings = this.getConsentSettings();
    const metrics = await secureStorage.getStorageMetrics();

    return {
      entries,
      settings,
      exportDate: new Date().toISOString(),
      version: this.VERSION,
      totalEntries: metrics.totalEntries,
      totalSize: metrics.totalSize
    };
  }

  /**
   * Export data as JSON file
   */
  async exportAsJSON(): Promise<void> {
    const data = await this.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `heijo-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from a previously exported JSON file
   */
  async importFromJSON(file: File): Promise<{ imported: number }>{
    const text = await file.text();
    const parsed = JSON.parse(text) as DataExport | { entries: JournalEntry[] };
    const entries: JournalEntry[] = (parsed as any).entries || [];

    let imported = 0;
    for (const entry of entries) {
      try {
        await secureStorage.saveEntry({
          content: entry.content,
          created_at: entry.created_at,
          source: entry.source,
          tags: entry.tags || [],
          user_id: entry.user_id
        } as any);
        imported++;
      } catch (e) {
        console.warn('Failed to import entry', entry.id, e);
      }
    }
    return { imported };
  }

  /**
   * Export data as CSV file
   */
  async exportAsCSV(): Promise<void> {
    const data = await this.exportAllData();
    const csvContent = this.convertToCSV(data.entries);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `heijo-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Delete all user data
   */
  async deleteAllData(): Promise<void> {
    await secureStorage.clearAllData();
    
    // Clear consent settings
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CONSENT_KEY);
    }
  }

  /**
   * Get privacy metrics
   */
  async getPrivacyMetrics(): Promise<PrivacyMetrics> {
    const metrics = await secureStorage.getStorageMetrics();
    const consent = this.getConsentSettings();

    return {
      totalEntries: metrics.totalEntries,
      totalSize: metrics.totalSize,
      oldestEntry: metrics.oldestEntry,
      newestEntry: metrics.newestEntry,
      consentGiven: consent.dataStorage,
      dataRetentionDays: 365 // Default retention period
    };
  }

  /**
   * Check if data retention period has expired
   */
  async checkDataRetention(): Promise<{ expired: boolean; entriesToDelete: number }> {
    const entries = await secureStorage.getEntries();
    const retentionDays = 365; // 1 year
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredEntries = entries.filter(entry => 
      new Date(entry.created_at) < cutoffDate
    );

    return {
      expired: expiredEntries.length > 0,
      entriesToDelete: expiredEntries.length
    };
  }

  /**
   * Clean up expired data
   */
  async cleanupExpiredData(): Promise<number> {
    const retention = await this.checkDataRetention();
    if (!retention.expired) return 0;

    const entries = await secureStorage.getEntries();
    const retentionDays = 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let deletedCount = 0;
    for (const entry of entries) {
      if (new Date(entry.created_at) < cutoffDate) {
        await secureStorage.deleteEntry(entry.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get default consent settings
   */
  private getDefaultConsent(): ConsentSettings {
    return {
      microphone: false,
      dataStorage: false,
      analytics: false,
      lastUpdated: new Date().toISOString(),
      version: this.VERSION
    };
  }

  /**
   * Convert entries to CSV format
   */
  private convertToCSV(entries: JournalEntry[]): string {
    const headers = ['ID', 'Created At', 'Content', 'Source', 'Tags', 'Sync Status'];
    const rows = entries.map(entry => [
      entry.id,
      entry.created_at,
      `"${entry.content.replace(/"/g, '""')}"`, // Escape quotes
      entry.source,
      entry.tags.join(';'),
      entry.sync_status
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }
}

export const gdprManager = GDPRManager.getInstance();





