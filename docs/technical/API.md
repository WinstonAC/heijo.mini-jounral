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

## Voice Recognition API

### Architecture

The voice recognition system supports two providers with automatic browser detection:

1. **WebSpeech API** (Browser-native, no API keys)
   - Chrome/Edge Desktop
   - Safari Desktop (14.1+)
   - Real-time streaming transcription with interim results
   - <300ms latency for first partial results
   - Continuous mode with accumulated final transcripts

2. **Backend STT** (Requires API keys)
   - iOS Safari
   - Firefox
   - Chrome iOS
   - Uses Whisper (OpenAI) or Google STT
   - Records audio via MediaRecorder and sends to `/api/stt`
   - 90-second maximum recording duration

### Browser Detection

```typescript
// lib/browserCapabilities.ts
export type VoiceCapabilities = {
  hasWebSpeech: boolean;
  hasMediaRecorder: boolean;
  isSecureContext: boolean;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  isMobile: boolean;
};

export function detectVoiceCapabilities(): VoiceCapabilities {
  // Detects browser type, WebSpeech availability, MediaRecorder support, secure context
  // Returns capabilities object with browser-specific information
}

export function getRecommendedProvider(capabilities: VoiceCapabilities): 'webspeech' | 'backend' | 'unsupported' {
  // Auto-selects best provider based on browser:
  // - Chrome/Edge Desktop → WebSpeech
  // - Safari Desktop → WebSpeech
  // - iOS Safari/Firefox → Backend STT
  // - Unsupported browsers → 'unsupported'
}
```

### WebSpeech Engine

```typescript
// lib/voiceToText.ts
class VoiceToTextEngine {
  private recognition: SpeechRecognition | null = null;
  private accumulatedFinalTranscript: string = ''; // Accumulates final transcripts across events
  
  async initialize(): Promise<boolean> {
    // Returns false if WebSpeech unavailable
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;
    
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    return true;
  }
  
  async start(): Promise<void> {
    // Resets accumulated transcript on new session
    this.accumulatedFinalTranscript = '';
    // Starts real-time streaming transcription
    this.recognition.start();
  }
  
  // Emits both interim (isFinal: false) and final (isFinal: true) results
  // Final transcripts are accumulated across multiple recognition events
}
```

### Backend STT API Route

```typescript
// app/api/stt/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;
  const language = formData.get('language') as string;
  const provider = formData.get('provider') as 'whisper' | 'google';
  
  // Sends to Whisper or Google STT API
  // Returns { text: string }
}

// Environment variables required:
// - WHISPER_API_KEY or OPENAI_API_KEY
// - GOOGLE_STT_KEY (optional)
```

### Backend STT Engine

```typescript
// lib/voiceToText.ts
class BackendSTTEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private maxRecordingDuration: number = 90000; // 90 seconds hard cap
  
  async start(): Promise<void> {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    
    // Determine MIME type based on browser support
    const options: MediaRecorderOptions = {};
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      options.mimeType = 'audio/webm';
    }
    
    this.mediaRecorder = new MediaRecorder(stream, options);
    this.mediaRecorder.start(1000); // Collect data every second
    this.startMaxDurationTimer(); // 90-second hard cap
  }
  
  private async processRecording(): Promise<void> {
    // Stops recording, creates blob
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // Sends to backend API
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', this.currentLanguage);
    formData.append('provider', this.provider);
    
    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });
    
    const { text } = await response.json();
    // Only emits final results (no interim support for backend STT)
    this.onResultCallback?.({ 
      text: text.trim(), 
      confidence: 1.0, 
      isFinal: true, 
      timestamp: performance.now() 
    });
  }
}
```

### Enhanced MicButton Factory

The voice system uses a factory function to create enhanced mic button instances:

```typescript
// lib/voiceToText.ts
export function createEnhancedMicButton(
  language: string = 'en-US', 
  provider: VoiceProvider = 'webspeech'
): EnhancedMicButton {
  // Creates an EnhancedMicButton instance that wraps VoiceToTextEngine or BackendSTTEngine
  // Provides unified interface for both providers
  // Handles language switching, provider selection, and error handling
}

// EnhancedMicButton provides:
// - startListening(): Promise<void>
// - stopListening(): Promise<void>
// - setLanguage(language: string): void
// - onResult(callback: (text: string, isFinal: boolean) => void): void
// - onError(callback: (error: string) => void): void
// - onStart(callback: () => void): void
// - onStop(callback: () => void): void
```

### Voice Activity Detection (VAD)

Optional voice activity detection for enhanced recording control:

```typescript
// lib/voiceToText.ts
class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private threshold: number = 0.3;
  
  async initialize(): Promise<boolean> {
    // Initializes Web Audio API for voice activity detection
    // Uses AnalyserNode to monitor audio levels
    // Returns false if initialization fails
  }
  
  getAudioLevel(): number {
    // Returns normalized audio level (0-1)
    // Used for visual feedback and voice activity detection
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
