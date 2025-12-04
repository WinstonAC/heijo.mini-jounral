/**
 * High-quality streaming voice-to-text implementation
 * Optimized for low latency and best-in-class transcription quality
 */

// Speech Recognition interfaces
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type VoiceProvider = 'webspeech' | 'whisper' | 'google';

export interface VoiceConfig {
  language: string;
  provider?: VoiceProvider; // Future-proof: support multiple STT providers
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  sampleRate: number;
  chunkSize: number; // in milliseconds
  vadThreshold: number; // voice activity detection threshold
  maxSilenceDuration: number; // in milliseconds
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface VoiceMetrics {
  firstPartialLatency: number; // milliseconds
  finalLatency: number; // milliseconds
  totalDuration: number; // milliseconds
  chunksProcessed: number;
  averageChunkLatency: number; // milliseconds
}

class VoiceToTextEngine {
  private recognition: SpeechRecognition | null = null;
  private config: VoiceConfig;
  private isListening: boolean = false;
  private startTime: number = 0;
  private metrics: VoiceMetrics = {
    firstPartialLatency: 0,
    finalLatency: 0,
    totalDuration: 0,
    chunksProcessed: 0,
    averageChunkLatency: 0
  };
  private onResultCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;
  private silenceTimer: NodeJS.Timeout | null = null;
  private lastSpeechTime: number = 0;
  private accumulatedFinalTranscript: string = ''; // Accumulate final transcripts across events

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      language: config.language || 'en-US',
      provider: config.provider || 'webspeech',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      sampleRate: 16000,
      chunkSize: 1000, // 1 second chunks
      vadThreshold: 0.3,
      maxSilenceDuration: 2000, // 2 seconds
      ...config
    };
  }

  /**
   * Initialize the voice recognition engine
   */
  async initialize(): Promise<boolean> {
    // If we've already created a recognition instance, reuse it
    if (this.recognition) {
      return true;
    }

    if (typeof window === 'undefined') {
      console.log('VoiceToTextEngine: Window not available (SSR)');
      return false;
    }

    // Only WebSpeech is supported by this engine
    if (this.config.provider !== 'webspeech') {
      console.warn(`VoiceToTextEngine: Provider ${this.config.provider} not supported. Use BackendSTTEngine instead.`);
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('VoiceToTextEngine: Speech recognition not supported in this browser');
      return false; // Don't throw, return false so caller can handle gracefully
    }

    console.log(`VoiceToTextEngine: Initializing speech recognition with language: ${this.config.language}`);
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
    console.log('VoiceToTextEngine: Speech recognition initialized successfully');
    return true;
  }

  /**
   * Update the language for recognition
   * This will update the recognition engine's language setting
   */
  setLanguage(language: string): void {
    if (this.config.language === language) {
      return; // No change needed
    }

    const wasListening = this.isListening;
    
    // Stop current recognition if active
    if (wasListening) {
      this.stop();
    }

    // Update config
    this.config.language = language;

    // Update recognition language if it exists
    if (this.recognition) {
      this.recognition.lang = language;
      console.log(`VoiceToTextEngine: Language updated to ${language}`);
    }
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.config.language;
  }

  /**
   * Start voice recognition
   */
  async start(): Promise<void> {
    if (!this.recognition) {
      await this.initialize();
    }

    if (!this.recognition) {
      throw new Error('Failed to initialize speech recognition');
    }

    // Ensure language is set correctly before starting
    if (this.recognition.lang !== this.config.language) {
      this.recognition.lang = this.config.language;
      console.log(`VoiceToTextEngine: Language set to ${this.config.language} before start`);
    }

    this.isListening = true;
    this.startTime = performance.now();
    this.lastSpeechTime = this.startTime;
    this.accumulatedFinalTranscript = ''; // Reset accumulated transcript on start
    this.metrics = {
      firstPartialLatency: 0,
      finalLatency: 0,
      totalDuration: 0,
      chunksProcessed: 0,
      averageChunkLatency: 0
    };

    try {
      this.recognition.start();
    } catch (error) {
      this.isListening = false;
      throw new Error(`Failed to start voice recognition: ${error}`);
    }
  }

  /**
   * Stop voice recognition
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.metrics.totalDuration = performance.now() - this.startTime;
      this.clearSilenceTimer();
      
      // If there's accumulated final transcript that hasn't been emitted, emit it now
      if (this.accumulatedFinalTranscript.trim()) {
        this.onResultCallback?.({
          text: this.accumulatedFinalTranscript.trim(),
          confidence: 1.0,
          isFinal: true,
          timestamp: performance.now()
        });
        this.accumulatedFinalTranscript = '';
      }
    }
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Get current metrics
   */
  getMetrics(): VoiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Set up recognition event handlers
   */
  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    
    // Verify continuous mode is set correctly (for debugging)
    if (this.config.continuous && !this.recognition.continuous) {
      console.warn('VoiceToTextEngine: Warning - continuous mode may not be supported by browser');
    }

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('[Heijo][Voice][WebSpeech] onstart');
      this.onStartCallback?.();
    };

    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      this.clearSilenceTimer();
      console.error('[Heijo][Voice][WebSpeech] onerror', {
        error: (event as SpeechRecognitionErrorEvent).error,
        message: (event as SpeechRecognitionErrorEvent).message
      });
      this.onErrorCallback?.((event as SpeechRecognitionErrorEvent).error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.clearSilenceTimer();
      
      // If there's accumulated final transcript that hasn't been emitted, emit it now
      if (this.accumulatedFinalTranscript.trim()) {
        this.onResultCallback?.({
          text: this.accumulatedFinalTranscript.trim(),
          confidence: 1.0,
          isFinal: true,
          timestamp: performance.now()
        });
        this.accumulatedFinalTranscript = '';
      }
      
      console.log('[Heijo][Voice][WebSpeech] onend');
      this.onEndCallback?.();
    };

    this.recognition.onaudiostart = () => {
      console.log('[Heijo][Voice][WebSpeech] onaudiostart');
    };

    this.recognition.onspeechstart = () => {
      this.lastSpeechTime = performance.now();
      this.clearSilenceTimer();
      console.log('[Heijo][Voice][WebSpeech] onspeechstart');
    };

    this.recognition.onspeechend = () => {
      this.startSilenceTimer();
      console.log('[Heijo][Voice][WebSpeech] onspeechend');
    };

    this.recognition.onaudioend = () => {
      console.log('[Heijo][Voice][WebSpeech] onaudioend');
    };

    this.recognition.onnomatch = () => {
      console.warn('[Heijo][Voice][WebSpeech] onnomatch');
    };
  }

  /**
   * Handle recognition results with latency tracking
   * FIXED: Process ALL results in event, not just from resultIndex, to capture full sentences
   */
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    const currentTime = performance.now();
    const chunkLatency = currentTime - this.startTime;
    
    this.metrics.chunksProcessed++;
    this.metrics.averageChunkLatency = 
      (this.metrics.averageChunkLatency * (this.metrics.chunksProcessed - 1) + chunkLatency) / 
      this.metrics.chunksProcessed;

    let finalTranscript = '';
    let interimTranscript = '';
    let maxConfidence = 0;

    // FIXED: Process ALL results from 0 to length, not just from resultIndex
    // This ensures we capture all final results, not just the fragment at resultIndex
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0;

      if (result.isFinal) {
        finalTranscript += transcript;
        maxConfidence = Math.max(maxConfidence, confidence);
      } else {
        // Only include interim results from resultIndex onwards (to avoid duplicates)
        if (i >= event.resultIndex) {
          interimTranscript += transcript;
        }
      }
    }

    // Debug logging to help validate behavior
    console.log('WebSpeech onresult:', {
      resultIndex: event.resultIndex,
      resultsLength: event.results.length,
      finalTranscript,
      interimTranscript,
      accumulatedFinalTranscript: this.accumulatedFinalTranscript
    });

    // Accumulate final transcripts across multiple events
    if (finalTranscript) {
      this.accumulatedFinalTranscript += (this.accumulatedFinalTranscript ? ' ' : '') + finalTranscript;
      // Emit the accumulated final transcript (full sentence)
      this.onResultCallback?.({
        text: this.accumulatedFinalTranscript,
        confidence: maxConfidence,
        isFinal: true,
        timestamp: currentTime
      });
      // NOTE: Do NOT reset accumulatedFinalTranscript here - it should persist for the entire mic session
      // The accumulator is reset in start() when a new session begins, and in stop()/onend when the session ends
    }

    // Track first partial result latency
    if (interimTranscript && this.metrics.firstPartialLatency === 0) {
      this.metrics.firstPartialLatency = chunkLatency;
    }

    // Track final result latency
    if (finalTranscript) {
      this.metrics.finalLatency = chunkLatency;
    }

    // Emit interim results for live feedback (only from resultIndex onwards)
    if (interimTranscript) {
      this.onResultCallback?.({
        text: interimTranscript,
        confidence: maxConfidence,
        isFinal: false,
        timestamp: currentTime
      });
    }
  }

  /**
   * Start silence detection timer
   * For WebSpeech, this provides a safety net for very long pauses
   * but should be generous enough to allow natural speech patterns
   */
  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    // Only start timer if maxSilenceDuration is > 0 (allows disabling)
    if (this.config.maxSilenceDuration > 0) {
      this.silenceTimer = setTimeout(() => {
        if (this.isListening) {
          console.log('VoiceToTextEngine: Silence timeout reached, stopping recognition');
          this.stop();
        }
      }, this.config.maxSilenceDuration);
    }
  }

  /**
   * Clear silence detection timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Set event callbacks
   */
  onResult(callback: (result: TranscriptionResult) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.clearSilenceTimer();
    this.recognition = null;
    this.onResultCallback = undefined;
    this.onErrorCallback = undefined;
    this.onStartCallback = undefined;
    this.onEndCallback = undefined;
  }
}

/**
 * Backend STT Engine using API route
 * Records audio and sends to backend for transcription
 */
class BackendSTTEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private currentLanguage: string;
  private provider: 'whisper' | 'google';
  private onResultCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;
  private silenceTimer: NodeJS.Timeout | null = null;
  private maxDurationTimer: NodeJS.Timeout | null = null;
  private maxSilenceDuration: number = 0; // Disabled - only stop on manual tap or max duration
  private maxRecordingDuration: number = 90000; // 90 seconds hard cap
  private startTime: number = 0;

  constructor(language: string = 'en-US', provider: 'whisper' | 'google' = 'whisper') {
    this.currentLanguage = language;
    this.provider = provider;
  }

  setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  getLanguage(): string {
    return this.currentLanguage;
  }

  async initialize(): Promise<boolean> {
    // Backend STT doesn't need browser API initialization
    // Just verify MediaRecorder is available
    if (typeof window === 'undefined') {
      return false;
    }

    if (typeof MediaRecorder === 'undefined') {
      console.error('BackendSTTEngine: MediaRecorder not supported');
      return false;
    }

    return true;
  }

  async start(): Promise<void> {
    if (this.isRecording) {
      console.warn('BackendSTTEngine: Already recording');
      return;
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
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
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options.mimeType = 'audio/ogg;codecs=opus';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.processRecording();
      };

      this.isRecording = true;
      this.startTime = performance.now();
      this.mediaRecorder.start(1000); // Collect data every second
      this.onStartCallback?.();

      // Start max duration timer (hard cap to prevent runaway recordings)
      this.startMaxDurationTimer();
      
      // Note: Silence timer is disabled for backend STT
      // Recording stops only on manual tap or max duration reached
    } catch (error) {
      this.isRecording = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      this.onErrorCallback?.(errorMessage);
      throw new Error(`Failed to start backend STT: ${errorMessage}`);
    }
  }

  stop(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    this.clearSilenceTimer();
    this.clearMaxDurationTimer();
    this.isRecording = false;

    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.onEndCallback?.();
  }

  isActive(): boolean {
    return this.isRecording;
  }

  private startSilenceTimer(): void {
    // Disabled for backend STT - only stop on manual tap or max duration
    // This prevents "first word only" recordings
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private startMaxDurationTimer(): void {
    this.clearMaxDurationTimer();
    this.maxDurationTimer = setTimeout(() => {
      if (this.isRecording) {
        console.log('BackendSTTEngine: Max duration reached, stopping recording');
        const duration = performance.now() - this.startTime;
        this.stop();
        // Show gentle message about duration limit
        this.onErrorCallback?.('We captured up to about a minute of speech. For longer thoughts, consider pausing and saving between sections.');
      }
    }, this.maxRecordingDuration);
  }

  private clearMaxDurationTimer(): void {
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  private async processRecording(): Promise<void> {
    if (this.audioChunks.length === 0) {
      console.warn('BackendSTTEngine: No audio chunks to process');
      this.onErrorCallback?.('We didn\'t capture any audio. Please try again and make sure mic access is allowed.');
      return;
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      // Send to backend API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', this.currentLanguage);
      formData.append('provider', this.provider);

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        console.error('BackendSTTEngine: API error:', errorMessage);
        this.onErrorCallback?.('There was a problem transcribing your audio. Please try again.');
        return;
      }

      const data = await response.json();
      const transcript = data.text || '';

      // Use full transcript as-is - no truncation or filtering
      if (transcript && transcript.trim().length > 0) {
        this.onResultCallback?.({
          text: transcript.trim(), // Only trim whitespace, no other modification
          confidence: 1.0, // Backend doesn't provide confidence
          isFinal: true,
          timestamp: performance.now(),
        });
      } else {
        // Handle empty transcript gracefully
        console.warn('BackendSTTEngine: Received empty transcript from API');
        this.onErrorCallback?.('We couldn\'t hear anything clear. Try speaking a bit closer to the mic.');
      }
    } catch (error) {
      console.error('BackendSTTEngine: Transcription failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
      // Surface network and other errors to user
      this.onErrorCallback?.('There was a problem transcribing your audio. Please try again.');
    } finally {
      this.audioChunks = [];
    }
  }

  onResult(callback: (result: TranscriptionResult) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  getMetrics(): VoiceMetrics {
    // Backend STT doesn't track metrics the same way
    return {
      firstPartialLatency: 0,
      finalLatency: 0,
      totalDuration: 0,
      chunksProcessed: 0,
      averageChunkLatency: 0,
    };
  }

  destroy(): void {
    this.stop();
    this.clearSilenceTimer();
    this.clearMaxDurationTimer();
    this.onResultCallback = undefined;
    this.onErrorCallback = undefined;
    this.onStartCallback = undefined;
    this.onEndCallback = undefined;
  }
}

/**
 * Voice Activity Detection (VAD) using Web Audio API
 */
class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null; // Store stream reference for cleanup
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private isActive: boolean = false;
  private threshold: number;
  private onVoiceStart?: () => void;
  private onVoiceEnd?: () => void;

  constructor(threshold: number = 0.3) {
    this.threshold = threshold;
  }

  async initialize(): Promise<boolean> {
    // Idempotency check: If already initialized and stream is active, return true
    if (this.audioContext && this.stream && this.stream.active && this.microphone) {
      return true;
    }
    
    // If partially initialized but stream is inactive, clean up first
    if (this.audioContext && (!this.stream || !this.stream.active)) {
      this.destroy();
    }
    
    try {
      console.log('VoiceActivityDetector: Initializing audio context and microphone access');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      console.log('VoiceActivityDetector: Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Validate stream before use
      if (!stream || !stream.active) {
        throw new Error('Microphone stream is null or inactive');
      }
      
      // Validate audioContext before use
      if (!this.audioContext || !stream) {
        throw new Error('AudioContext or stream is null');
      }
      
      // Store stream reference for cleanup
      this.stream = stream;
      
      console.log('VoiceActivityDetector: Microphone access granted, setting up audio processing');
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      console.log('VoiceActivityDetector: Initialized successfully');
      return true;
    } catch (error) {
      // Clean up audioContext if it was created
      if (this.audioContext) {
        try {
          this.audioContext.close();
        } catch (_) {
          // Ignore errors during cleanup
        }
        this.audioContext = null;
      }
      
      // Clean up stream if it was obtained
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // Clean up other resources
      this.analyser = null;
      this.microphone = null;
      this.dataArray = null;
      
      console.error('VoiceActivityDetector: Failed to initialize VAD:', error);
      return false;
    }
  }

  start(): void {
    if (!this.analyser || !this.dataArray) return;
    
    this.isActive = true;
    this.detectVoice();
  }

  stop(): void {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private detectVoice(): void {
    if (!this.isActive || !this.analyser || !this.dataArray) return;

    (this.analyser as any).getByteFrequencyData(this.dataArray);
    
    // Calculate average volume
    const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
    const normalizedVolume = average / 255;

    if (normalizedVolume > this.threshold) {
      this.onVoiceStart?.();
    } else {
      this.onVoiceEnd?.();
    }

    this.animationFrame = requestAnimationFrame(() => this.detectVoice());
  }

  onVoiceDetected(startCallback: () => void, endCallback: () => void): void {
    this.onVoiceStart = startCallback;
    this.onVoiceEnd = endCallback;
  }

  destroy(): void {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
  }
}

/**
 * Enhanced MicButton component with streaming transcription
 * Supports both WebSpeech and backend STT providers
 */
export class EnhancedMicButton {
  private voiceEngine: VoiceToTextEngine | BackendSTTEngine;
  private vad: VoiceActivityDetector | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false; // Guard to prevent concurrent initialization
  private vadInitialized: boolean = false;
  private vadInitPromise: Promise<boolean> | null = null;
  private currentLanguage: string;
  private currentProvider: VoiceProvider;
  private useBackend: boolean;

  constructor(language: string = 'en-US', provider: VoiceProvider = 'webspeech') {
    this.currentLanguage = language;
    this.currentProvider = provider;
    this.useBackend = provider === 'whisper' || provider === 'google';
    
    if (this.useBackend) {
      // Use backend STT engine
      this.voiceEngine = new BackendSTTEngine(
        language,
        provider === 'google' ? 'google' : 'whisper'
      );
      // VAD is optional for backend (can work without it)
      this.vad = null;
    } else {
      // Use WebSpeech engine
      this.voiceEngine = new VoiceToTextEngine({
        language: language,
        provider: provider,
        continuous: true,
        interimResults: true,
        chunkSize: 500, // 500ms chunks for low latency
        maxSilenceDuration: 10000 // 10 seconds - more forgiving for natural speech pauses
      });
      this.vad = new VoiceActivityDetector(0.3);
    }
  }

  /**
   * Update the language for voice recognition
   */
  setLanguage(language: string): void {
    if (this.currentLanguage === language) {
      return; // No change needed
    }

    const wasActive = this.voiceEngine.isActive();
    
    // Stop if currently listening
    if (wasActive) {
      this.stopListening();
    }

    // Update language
    this.currentLanguage = language;
    this.voiceEngine.setLanguage(language);

    // Restart if it was active
    if (wasActive) {
      // Note: We can't restart here automatically because we need the callbacks
      // The caller should handle restarting if needed
      console.log(`EnhancedMicButton: Language updated to ${language}. Restart listening to apply.`);
    }
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Update the provider
   */
  setProvider(provider: VoiceProvider): void {
    if (this.currentProvider === provider) {
      return;
    }

    const wasActive = this.voiceEngine.isActive();
    
    if (wasActive) {
      this.stopListening();
    }

    // Destroy old engine
    this.voiceEngine.destroy();
    if (this.vad) {
      this.vad.destroy();
    }

    // Create new engine based on provider
    this.currentProvider = provider;
    this.useBackend = provider === 'whisper' || provider === 'google';
    
    if (this.useBackend) {
      this.voiceEngine = new BackendSTTEngine(
        this.currentLanguage,
        provider === 'google' ? 'google' : 'whisper'
      );
      this.vad = null;
    } else {
      this.voiceEngine = new VoiceToTextEngine({
        language: this.currentLanguage,
        provider: provider,
        continuous: true,
        interimResults: true,
        chunkSize: 500,
        maxSilenceDuration: 3000
      });
      this.vad = new VoiceActivityDetector(0.3);
    }

    // Re-initialize
    this.isInitialized = false;
    this.vadInitialized = false;
    this.vadInitPromise = null;
  }

  /**
   * Get current provider
   */
  getProvider(): VoiceProvider {
    return this.currentProvider;
  }

  async initialize(): Promise<boolean> {
    // Guard: Prevent concurrent initialization
    if (this.isInitializing) {
      console.warn('EnhancedMicButton: Already initializing, skipping');
      return this.isInitialized;
    }
    
    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }
    
    this.isInitializing = true;
    
    try {
      console.log(`EnhancedMicButton: Initializing ${this.useBackend ? 'backend' : 'webspeech'} engine...`);
      const voiceReady = await this.voiceEngine.initialize();
      console.log('EnhancedMicButton: Voice engine ready:', voiceReady);
      
      // VAD is optional for backend STT
      if (this.useBackend) {
        this.isInitialized = voiceReady;
        this.vadInitialized = false; // Backend doesn't use VAD
        this.vadInitPromise = null; // Clear promise
        console.log('EnhancedMicButton: Backend STT initialized:', this.isInitialized);
        return this.isInitialized;
      }
      
      // For WebSpeech, try to initialize VAD (but don't fail if it doesn't work)
      if (this.vad) {
        if (!this.vadInitPromise) {
          this.vadInitPromise = this.vad.initialize();
        }
        const vadReady = await this.vadInitPromise;
        if (!vadReady) {
          console.warn('EnhancedMicButton: VAD initialization failed, continuing without it');
        }
        console.log('EnhancedMicButton: VAD ready:', vadReady);
        // VAD failure shouldn't prevent WebSpeech from working
        this.isInitialized = voiceReady;
        this.vadInitialized = vadReady; // Explicitly set based on VAD result
      } else {
        this.isInitialized = voiceReady;
        this.vadInitialized = false; // No VAD instance
        this.vadInitPromise = null; // Clear promise
      }
      
      console.log('EnhancedMicButton: Overall initialization result:', this.isInitialized);
      return this.isInitialized;
    } catch (error) {
      console.error('EnhancedMicButton: Failed to initialize enhanced mic:', error);
      this.isInitialized = false;
      this.vadInitialized = false;
      this.vadInitPromise = null;
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  async startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!this.isInitialized) {
      console.log('EnhancedMicButton: Voice recognition not initialized');
      onError('Voice recognition not initialized');
      return;
    }

    console.log(`EnhancedMicButton: Starting ${this.useBackend ? 'backend' : 'webspeech'} voice recognition`);
    this.voiceEngine.onResult((result) => {
      onTranscript(result.text, result.isFinal);
    });

    this.voiceEngine.onError(onError);
    if (onStart) this.voiceEngine.onStart(onStart);
    if (onEnd) this.voiceEngine.onEnd(onEnd);

    try {
      // For WebSpeech, start VAD if it's already initialized (VAD should be initialized in initialize(), not here)
      if (!this.useBackend && this.vad) {
        if (!this.vadInitialized) {
          console.warn('EnhancedMicButton: VAD not initialized, starting without it');
        } else {
          this.vad.start();
        }
      }

      await this.voiceEngine.start();
    } catch (error) {
      if (!this.useBackend && !this.vadInitialized) {
        this.vadInitPromise = null;
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  stopListening(): void {
    this.voiceEngine.stop();
    if (this.vad) {
      this.vad.stop();
    }
  }

  isActive(): boolean {
    return this.voiceEngine.isActive();
  }

  getMetrics(): VoiceMetrics {
    return this.voiceEngine.getMetrics();
  }

  destroy(): void {
    this.voiceEngine.destroy();
    if (this.vad) {
      this.vad.destroy();
    }
    this.isInitialized = false;
    this.vadInitialized = false;
    this.vadInitPromise = null;
  }
}

// Note: We no longer export a singleton instance
// Each MicButton component should create its own instance or use a factory
// This allows different components to use different languages/providers

/**
 * Factory function to create an EnhancedMicButton instance
 * This allows each component to have its own instance with its own language
 */
export function createEnhancedMicButton(language: string = 'en-US', provider: VoiceProvider = 'webspeech'): EnhancedMicButton {
  return new EnhancedMicButton(language, provider);
}

