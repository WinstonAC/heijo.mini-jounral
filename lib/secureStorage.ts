/**
 * Secure local storage with encryption and privacy controls
 * Implements local-first data storage with AES-GCM encryption
 */

import { encryptionManager, EncryptedData, EncryptionManager } from './encryption';
import { JournalEntry } from './store';

export interface SecureStorageConfig {
  encryptData: boolean;
  autoDeleteAfterDays?: number;
  maxStorageSize?: number; // in MB
}

export interface StorageMetrics {
  totalEntries: number;
  totalSize: number; // in bytes
  oldestEntry?: Date;
  newestEntry?: Date;
}

class SecureLocalStorage {
  private config: SecureStorageConfig;
  private readonly STORAGE_KEY = 'heijo-secure-entries';
  private readonly METADATA_KEY = 'heijo-storage-metadata';
  private readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB default

  constructor(config: SecureStorageConfig = { encryptData: true }) {
    this.config = {
      encryptData: true,
      autoDeleteAfterDays: 365, // 1 year default
      maxStorageSize: this.MAX_STORAGE_SIZE,
      ...config
    };
  }

  /**
   * Save a journal entry with encryption
   */
  async saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'>): Promise<JournalEntry> {
    const newEntry: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      sync_status: 'local_only',
      last_synced: undefined
    };

    try {
      const serializedEntry = JSON.stringify(newEntry);
      
      if (this.config.encryptData && EncryptionManager.isSupported()) {
        const encryptedData = await encryptionManager.encrypt(serializedEntry);
        await this.storeEncryptedEntry(newEntry.id, encryptedData);
      } else {
        await this.storePlainEntry(newEntry.id, serializedEntry);
      }

      // Update metadata
      await this.updateMetadata();
      
      // Check storage limits
      await this.enforceStorageLimits();

      return newEntry;
    } catch (error) {
      console.error('Failed to save entry:', error);
      throw new Error('Failed to save journal entry');
    }
  }

  /**
   * Get all journal entries
   */
  async getEntries(): Promise<JournalEntry[]> {
    try {
      const entries: JournalEntry[] = [];
      const metadata = await this.getMetadata();
      
      for (const entryId of metadata.entryIds) {
        try {
          const entry = await this.getEntry(entryId);
          if (entry) {
            entries.push(entry);
          }
        } catch (error) {
          console.warn(`Failed to load entry ${entryId}:`, error);
        }
      }

      // Sort by creation date (newest first)
      return entries.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Failed to get entries:', error);
      return [];
    }
  }

  /**
   * Get a specific journal entry
   */
  async getEntry(id: string): Promise<JournalEntry | null> {
    try {
      if (this.config.encryptData && EncryptionManager.isSupported()) {
        const encryptedData = await this.getEncryptedEntry(id);
        if (!encryptedData) return null;
        
        const decryptedJson = await encryptionManager.decrypt(encryptedData);
        return JSON.parse(decryptedJson);
      } else {
        const plainData = await this.getPlainEntry(id);
        if (!plainData) return null;
        return JSON.parse(plainData);
      }
    } catch (error) {
      console.error(`Failed to get entry ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      if (this.config.encryptData && EncryptionManager.isSupported()) {
        await this.deleteEncryptedEntry(id);
      } else {
        await this.deletePlainEntry(id);
      }

      // Update metadata
      await this.updateMetadata();
    } catch (error) {
      console.error(`Failed to delete entry ${id}:`, error);
      throw new Error('Failed to delete journal entry');
    }
  }

  /**
   * Export all entries (unencrypted for user access)
   */
  async exportEntries(): Promise<JournalEntry[]> {
    return this.getEntries();
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    try {
      if (this.config.encryptData && EncryptionManager.isSupported()) {
        await encryptionManager.clearAllData();
      }
      
      // Clear IndexedDB
      const request = indexedDB.deleteDatabase('HeijoSecureStorage');
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw new Error('Failed to clear journal data');
    }
  }

  /**
   * Get storage metrics
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    const entries = await this.getEntries();
    const totalSize = await this.calculateStorageSize();
    
    return {
      totalEntries: entries.length,
      totalSize,
      oldestEntry: entries.length > 0 ? new Date(entries[entries.length - 1].created_at) : undefined,
      newestEntry: entries.length > 0 ? new Date(entries[0].created_at) : undefined
    };
  }

  /**
   * Check if storage is available
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  // Private methods for encrypted storage
  private async storeEncryptedEntry(id: string, encryptedData: EncryptedData): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HeijoSecureStorage', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('entries')) {
          db.createObjectStore('entries', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');
        
        store.put({
          id,
          ...encryptedData,
          createdAt: Date.now()
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async getEncryptedEntry(id: string): Promise<EncryptedData | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HeijoSecureStorage', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['entries'], 'readonly');
        const store = transaction.objectStore('entries');
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result) {
            resolve({
              data: result.data,
              iv: result.iv,
              keyId: result.keyId
            });
          } else {
            resolve(null);
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteEncryptedEntry(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HeijoSecureStorage', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');
        
        store.delete(id);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Private methods for plain storage (fallback)
  private async storePlainEntry(id: string, data: string): Promise<void> {
    localStorage.setItem(`${this.STORAGE_KEY}-${id}`, data);
  }

  private async getPlainEntry(id: string): Promise<string | null> {
    return localStorage.getItem(`${this.STORAGE_KEY}-${id}`);
  }

  private async deletePlainEntry(id: string): Promise<void> {
    localStorage.removeItem(`${this.STORAGE_KEY}-${id}`);
  }

  // Metadata management
  private async getMetadata(): Promise<{ entryIds: string[] }> {
    const stored = localStorage.getItem(this.METADATA_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Invalid metadata, return empty
      }
    }
    return { entryIds: [] };
  }

  private async updateMetadata(): Promise<void> {
    const entries = await this.getAllEntryIds();
    const metadata = { entryIds: entries };
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
  }

  private async getAllEntryIds(): Promise<string[]> {
    const ids: string[] = [];
    
    // Get from IndexedDB if using encryption
    if (this.config.encryptData && EncryptionManager.isSupported()) {
      try {
        const request = indexedDB.open('HeijoSecureStorage', 1);
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore('entries');
            const getAllRequest = store.getAllKeys();
            
            getAllRequest.onsuccess = () => {
              ids.push(...(getAllRequest.result as string[]));
              resolve();
            };
            getAllRequest.onerror = () => reject(getAllRequest.error);
          };
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('Failed to get entry IDs from IndexedDB:', error);
      }
    } else {
      // Get from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.STORAGE_KEY}-`)) {
          ids.push(key.replace(`${this.STORAGE_KEY}-`, ''));
        }
      }
    }
    
    return ids;
  }

  private async calculateStorageSize(): Promise<number> {
    let totalSize = 0;
    
    if (this.config.encryptData && EncryptionManager.isSupported()) {
      // Calculate IndexedDB size (approximate)
      const entries = await this.getEntries();
      totalSize = entries.reduce((size, entry) => {
        return size + JSON.stringify(entry).length;
      }, 0);
    } else {
      // Calculate localStorage size
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
    }
    
    return totalSize;
  }

  private async enforceStorageLimits(): Promise<void> {
    if (!this.config.maxStorageSize) return;

    const metrics = await this.getStorageMetrics();
    if (metrics.totalSize > this.config.maxStorageSize) {
      // Remove oldest entries until under limit
      const entries = await this.getEntries();
      const entriesToDelete = entries.slice(Math.floor(entries.length * 0.1)); // Remove 10% at a time
      
      for (const entry of entriesToDelete) {
        await this.deleteEntry(entry.id);
      }
    }

    // Auto-delete old entries
    if (this.config.autoDeleteAfterDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.autoDeleteAfterDays);
      
      const entries = await this.getEntries();
      for (const entry of entries) {
        if (new Date(entry.created_at) < cutoffDate) {
          await this.deleteEntry(entry.id);
        }
      }
    }
  }
}

export const secureStorage = new SecureLocalStorage();





