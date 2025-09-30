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

export interface VoiceConfig {
  language: string;
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

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      language: 'en-US',
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
    if (typeof window === 'undefined') {
      console.log('VoiceToTextEngine: Window not available (SSR)');
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('VoiceToTextEngine: Speech recognition not supported in this browser');
      throw new Error('Speech recognition not supported in this browser');
    }

    console.log('VoiceToTextEngine: Initializing speech recognition');
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
    console.log('VoiceToTextEngine: Speech recognition initialized successfully');
    return true;
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

    this.isListening = true;
    this.startTime = performance.now();
    this.lastSpeechTime = this.startTime;
    this.metrics = {
      firstPartialLatency: 0,
      finalLatency: 0,
      totalDuration: 0,
      chunksProcessed: 0,
      averageChunkLatency: 0
    };

    try {
      this.recognition.start();
      this.onStartCallback?.();
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

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStartCallback?.();
    };

    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      this.clearSilenceTimer();
      this.onErrorCallback?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.clearSilenceTimer();
      this.onEndCallback?.();
    };

    this.recognition.onspeechstart = () => {
      this.lastSpeechTime = performance.now();
      this.clearSilenceTimer();
    };

    this.recognition.onspeechend = () => {
      this.startSilenceTimer();
    };
  }

  /**
   * Handle recognition results with latency tracking
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

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0;

      if (result.isFinal) {
        finalTranscript += transcript;
        maxConfidence = Math.max(maxConfidence, confidence);
      } else {
        interimTranscript += transcript;
      }
    }

    // Track first partial result latency
    if (interimTranscript && this.metrics.firstPartialLatency === 0) {
      this.metrics.firstPartialLatency = chunkLatency;
    }

    // Track final result latency
    if (finalTranscript) {
      this.metrics.finalLatency = chunkLatency;
    }

    // Emit results
    if (interimTranscript) {
      this.onResultCallback?.({
        text: interimTranscript,
        confidence: maxConfidence,
        isFinal: false,
        timestamp: currentTime
      });
    }

    if (finalTranscript) {
      this.onResultCallback?.({
        text: finalTranscript,
        confidence: maxConfidence,
        isFinal: true,
        timestamp: currentTime
      });
    }
  }

  /**
   * Start silence detection timer
   */
  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        this.stop();
      }
    }, this.config.maxSilenceDuration);
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
 * Voice Activity Detection (VAD) using Web Audio API
 */
class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
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
      
      console.log('VoiceActivityDetector: Microphone access granted, setting up audio processing');
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      console.log('VoiceActivityDetector: Initialized successfully');
      return true;
    } catch (error) {
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
 */
export class EnhancedMicButton {
  private voiceEngine: VoiceToTextEngine;
  private vad: VoiceActivityDetector;
  private isInitialized: boolean = false;
  private vadInitialized: boolean = false;
  private vadInitPromise: Promise<boolean> | null = null;

  constructor() {
    this.voiceEngine = new VoiceToTextEngine({
      language: 'en-US',
      continuous: true,
      interimResults: true,
      chunkSize: 500, // 500ms chunks for low latency
      maxSilenceDuration: 3000 // 3 seconds
    });

    this.vad = new VoiceActivityDetector(0.3);
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('EnhancedMicButton: Initializing voice engine and VAD...');
      const voiceReady = await this.voiceEngine.initialize();
      console.log('EnhancedMicButton: Voice engine ready:', voiceReady);
      
      const vadReady = await this.vad.initialize();
      console.log('EnhancedMicButton: VAD ready:', vadReady);
      
      this.isInitialized = voiceReady && vadReady;
      console.log('EnhancedMicButton: Overall initialization result:', this.isInitialized);
      return this.isInitialized;
    } catch (error) {
      console.error('EnhancedMicButton: Failed to initialize enhanced mic:', error);
      return false;
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

    console.log('EnhancedMicButton: Starting voice recognition and VAD');
    this.voiceEngine.onResult((result) => {
      onTranscript(result.text, result.isFinal);
    });

    this.voiceEngine.onError(onError);
    if (onStart) this.voiceEngine.onStart(onStart);
    if (onEnd) this.voiceEngine.onEnd(onEnd);

    try {
      if (!this.vadInitialized) {
        if (!this.vadInitPromise) {
          this.vadInitPromise = this.vad.initialize();
        }

        const vadReady = await this.vadInitPromise;
        if (!vadReady) {
          this.vadInitPromise = null;
          throw new Error('Voice activity detection failed to initialize');
        }

        this.vadInitialized = true;
      }

      await this.voiceEngine.start();
      this.vad.start();
    } catch (error) {
      if (!this.vadInitialized) {
        this.vadInitPromise = null;
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  stopListening(): void {
    this.voiceEngine.stop();
    this.vad.stop();
  }

  isActive(): boolean {
    return this.voiceEngine.isActive();
  }

  getMetrics(): VoiceMetrics {
    return this.voiceEngine.getMetrics();
  }

  destroy(): void {
    this.voiceEngine.destroy();
    this.vad.destroy();
    this.isInitialized = false;
    this.vadInitialized = false;
    this.vadInitPromise = null;
  }
}

// Export singleton instance
export const enhancedMicButton = new EnhancedMicButton();





