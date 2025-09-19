/**
 * Local-first encryption utilities using Web Crypto API
 * Implements AES-GCM encryption for journal entries
 */

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string;   // Base64 encoded initialization vector
  keyId: string; // Key identifier for rotation
}

export interface DeviceKey {
  id: string;
  key: CryptoKey;
  createdAt: number;
}

class EncryptionManager {
  private static instance: EncryptionManager;
  private deviceKey: DeviceKey | null = null;
  private readonly STORAGE_KEY = 'heijo-device-key';
  private readonly KEY_ID = 'heijo-key-v1';

  private constructor() {}

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  /**
   * Initialize or retrieve device encryption key
   */
  async initializeKey(): Promise<CryptoKey> {
    if (this.deviceKey) {
      return this.deviceKey.key;
    }

    // Try to load existing key from IndexedDB
    const existingKey = await this.loadStoredKey();
    if (existingKey) {
      this.deviceKey = existingKey;
      return existingKey.key;
    }

    // Generate new key
    const key = await this.generateNewKey();
    this.deviceKey = key;
    await this.storeKey(key);
    return key.key;
  }

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(data: string): Promise<EncryptedData> {
    const key = await this.initializeKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );

    return {
      data: this.arrayBufferToBase64(encryptedBuffer),
      iv: this.arrayBufferToBase64(iv),
      keyId: this.KEY_ID
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const key = await this.initializeKey();
    
    const dataBuffer = this.base64ToArrayBuffer(encryptedData.data);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Generate a new AES-GCM key
   */
  private async generateNewKey(): Promise<DeviceKey> {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    return {
      id: this.KEY_ID,
      key,
      createdAt: Date.now()
    };
  }

  /**
   * Store key in IndexedDB
   */
  private async storeKey(keyData: DeviceKey): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const request = indexedDB.open('HeijoEncryption', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        
        // Store key material (extractable)
        const keyMaterial = await crypto.subtle.exportKey('raw', keyData.key);
        store.put({
          id: keyData.id,
          keyMaterial: this.arrayBufferToBase64(keyMaterial),
          createdAt: keyData.createdAt
        });
      };
    } catch (error) {
      console.warn('Failed to store encryption key:', error);
    }
  }

  /**
   * Load key from IndexedDB
   */
  private async loadStoredKey(): Promise<DeviceKey | null> {
    if (typeof window === 'undefined') return null;

    try {
      return new Promise((resolve) => {
        const request = indexedDB.open('HeijoEncryption', 1);
        
        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['keys'], 'readonly');
          const store = transaction.objectStore('keys');
          const getRequest = store.get(this.KEY_ID);
          
          getRequest.onsuccess = async () => {
            const result = getRequest.result;
            if (result) {
              try {
                const keyMaterial = this.base64ToArrayBuffer(result.keyMaterial);
                const key = await crypto.subtle.importKey(
                  'raw',
                  keyMaterial,
                  { name: 'AES-GCM' },
                  true,
                  ['encrypt', 'decrypt']
                );
                resolve({
                  id: result.id,
                  key,
                  createdAt: result.createdAt
                });
              } catch (error) {
                console.warn('Failed to import stored key:', error);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => resolve(null);
        };
        
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Failed to load encryption key:', error);
      return null;
    }
  }

  /**
   * Clear all stored encryption data
   */
  async clearAllData(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const request = indexedDB.deleteDatabase('HeijoEncryption');
      request.onsuccess = () => {
        this.deviceKey = null;
      };
    } catch (error) {
      console.warn('Failed to clear encryption data:', error);
    }
  }

  /**
   * Check if encryption is supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'crypto' in window && 
           'subtle' in window.crypto &&
           'indexedDB' in window;
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const encryptionManager = EncryptionManager.getInstance();
