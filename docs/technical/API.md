# API & External Integrations

## Overview

Heijō Mini-Journal integrates with **Supabase** for authentication and data storage, **Web Speech API** for voice recognition, and **local storage APIs** for offline functionality. The application follows a **privacy-first approach** with minimal external dependencies.

## Supabase Integration

### Authentication API

Supabase provides comprehensive authentication services:

```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Authentication methods
export const auth = {
  signIn: async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    return await supabase.auth.signInWithPassword({ email, password });
  },
  
  signUp: async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    return await supabase.auth.signUp({ email, password });
  },
  
  signInWithMagicLink: async (email: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/journal`
      }
    });
  },
  
  signOut: async () => {
    if (!supabase) return;
    return await supabase.auth.signOut();
  },
  
  getSession: async () => {
    if (!supabase) return { data: { session: null }, error: null };
    return await supabase.auth.getSession();
  }
};
```

### Database API

Supabase provides a PostgreSQL database with real-time capabilities:

```typescript
// lib/store.ts - SupabaseStorage class
export class SupabaseStorage implements StorageBackend {
  async saveEntry(entry: Omit<JournalEntry, 'id' | 'sync_status' | 'last_synced'>): Promise<JournalEntry> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([{ 
        ...entry, 
        user_id: user.id,
        sync_status: 'synced',
        last_synced: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async getEntries(): Promise<JournalEntry[]> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  async deleteEntry(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
```

### Real-time Subscriptions

Supabase provides real-time data synchronization:

```typescript
// lib/realtime.ts
export function subscribeToEntries(
  userId: string,
  onEntryChange: (entry: JournalEntry) => void
) {
  if (!supabase) return null;
  
  return supabase
    .channel('journal_entries')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'journal_entries',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onEntryChange(payload.new as JournalEntry);
      }
    )
    .subscribe();
}
```

## Web Speech API Integration

### Voice Recognition

Browser-native voice recognition for privacy:

```typescript
// lib/voiceToText.ts
export class VoiceToTextManager {
  private recognition: SpeechRecognition | null = null;
  private isSupported: boolean = false;
  
  constructor() {
    this.initializeRecognition();
  }
  
  private initializeRecognition() {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.isSupported = true;
      this.configureRecognition();
    }
  }
  
  private configureRecognition() {
    if (!this.recognition) return;
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
  }
  
  startRecording(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition || !this.isSupported) {
        reject(new Error('Speech recognition not supported'));
        return;
      }
      
      this.recognition.onstart = () => resolve();
      this.recognition.onerror = (event) => reject(new Error(event.error));
      
      this.recognition.start();
    });
  }
  
  stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.recognition) {
        resolve('');
        return;
      }
      
      let finalTranscript = '';
      
      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
      };
      
      this.recognition.onend = () => resolve(finalTranscript);
      this.recognition.stop();
    });
  }
}
```

### Audio Processing

Advanced audio processing for better recognition:

```typescript
// lib/audioProcessor.ts
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  
  async initializeAudio(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }
  
  getAudioLevel(): number {
    if (!this.analyser) return 0;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return average / 255; // Normalize to 0-1
  }
}
```

## Local Storage APIs

### IndexedDB Integration

For encrypted data storage:

```typescript
// lib/indexedDB.ts
export class IndexedDBManager {
  private dbName = 'HeijoDB';
  private version = 1;
  private db: IDBDatabase | null = null;
  
  async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', { keyPath: 'id' });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('user_id', 'user_id', { unique: false });
        }
      };
    });
  }
  
  async saveEntry(entry: JournalEntry): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['entries'], 'readwrite');
    const store = transaction.objectStore('entries');
    
    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getEntries(): Promise<JournalEntry[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['entries'], 'readonly');
    const store = transaction.objectStore('entries');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

### LocalStorage Fallback

Simple localStorage for configuration and fallback:

```typescript
// lib/localStorage.ts
export class LocalStorageManager {
  private prefix = 'heijo-';
  
  setItem(key: string, value: any): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
  
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }
  
  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }
  
  clear(): void {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.prefix)
    );
    keys.forEach(key => localStorage.removeItem(key));
  }
}
```

## External Service Integration

### Environment Configuration

```typescript
// lib/config.ts
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    enabled: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  },
  
  voice: {
    enabled: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    language: 'en-US',
    continuous: true,
    interimResults: true
  },
  
  storage: {
    maxSize: 50 * 1024 * 1024, // 50MB
    retentionDays: 365,
    encryptionEnabled: true
  },
  
  performance: {
    maxCpuUsage: 35,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    rateLimit: 100 // requests per hour
  }
};
```

### Error Handling

Comprehensive error handling for all external services:

```typescript
// lib/errorHandling.ts
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleSupabaseError(error: any): APIError {
  if (error.code === 'PGRST116') {
    return new APIError('Resource not found', 'NOT_FOUND', 404);
  }
  
  if (error.code === '23505') {
    return new APIError('Resource already exists', 'CONFLICT', 409);
  }
  
  if (error.code === '42501') {
    return new APIError('Insufficient permissions', 'FORBIDDEN', 403);
  }
  
  return new APIError(error.message || 'Unknown error', 'UNKNOWN', 500);
}

export function handleVoiceError(error: SpeechRecognitionError): APIError {
  switch (error.error) {
    case 'no-speech':
      return new APIError('No speech detected', 'NO_SPEECH');
    case 'audio-capture':
      return new APIError('Microphone not available', 'AUDIO_CAPTURE');
    case 'not-allowed':
      return new APIError('Microphone permission denied', 'NOT_ALLOWED');
    case 'network':
      return new APIError('Network error during recognition', 'NETWORK');
    default:
      return new APIError('Voice recognition failed', 'VOICE_ERROR');
  }
}
```

## API Rate Limiting

### Client-Side Rate Limiting

```typescript
// lib/rateLimiter.ts
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config = {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    blockDurationMs: 15 * 60 * 1000 // 15 minutes
  };
  
  async isAllowed(identifier: string = 'default'): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Clean old requests
    const recentRequests = userRequests.filter(
      time => now - time < this.config.windowMs
    );
    
    if (recentRequests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil(
        (oldestRequest + this.config.windowMs - now) / 1000
      );
      
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        retryAfter
      };
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return { allowed: true };
  }
}
```

## Data Synchronization

### Hybrid Sync Strategy

```typescript
// lib/syncManager.ts
export class SyncManager {
  private supabaseStorage: SupabaseStorage;
  private localStorage: LocalStorage;
  private rateLimiter: RateLimiter;
  
  async syncEntries(): Promise<SyncResult> {
    const rateLimitCheck = await this.rateLimiter.isAllowed();
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.reason);
    }
    
    try {
      const localEntries = await this.localStorage.getEntries();
      const syncedEntries = await this.supabaseStorage.getEntries();
      
      const conflicts = this.detectConflicts(localEntries, syncedEntries);
      const resolvedEntries = await this.resolveConflicts(conflicts);
      
      await this.uploadLocalEntries(resolvedEntries);
      
      return {
        success: true,
        syncedCount: resolvedEntries.length,
        conflictsResolved: conflicts.length
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private detectConflicts(local: JournalEntry[], remote: JournalEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    for (const localEntry of local) {
      const remoteEntry = remote.find(r => r.id === localEntry.id);
      if (remoteEntry && localEntry.last_synced !== remoteEntry.last_synced) {
        conflicts.push({
          local: localEntry,
          remote: remoteEntry,
          type: 'timestamp_mismatch'
        });
      }
    }
    
    return conflicts;
  }
}
```

## Performance Monitoring

### API Performance Tracking

```typescript
// lib/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  async trackAPICall<T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name}_error`, duration);
      throw error;
    }
  }
  
  private recordMetric(name: string, value: number): void {
    const existing = this.metrics.get(name) || [];
    existing.push(value);
    
    // Keep only last 100 measurements
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(name, existing);
  }
  
  getMetrics(): Record<string, { avg: number; min: number; max: number }> {
    const result: Record<string, { avg: number; min: number; max: number }> = {};
    
    for (const [name, values] of this.metrics) {
      if (values.length === 0) continue;
      
      const sum = values.reduce((a, b) => a + b, 0);
      result[name] = {
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }
    
    return result;
  }
}
```

## Security Considerations

### API Security

- **HTTPS Only**: All external API calls use HTTPS
- **Authentication**: All Supabase calls require authentication
- **Rate Limiting**: Client-side rate limiting prevents abuse
- **Input Validation**: All inputs validated before API calls
- **Error Handling**: Secure error messages without sensitive data

### Privacy Protection

- **Local-First**: All data stored locally by default
- **Encryption**: Sensitive data encrypted before storage
- **No Tracking**: No analytics or user tracking
- **GDPR Compliance**: Full data export and deletion

This API integration provides **secure**, **privacy-first**, and **performant** external service integration while maintaining **offline functionality** and **excellent user experience**.
