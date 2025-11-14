/**
 * Analytics system for Heijo
 * Collects anonymous usage data locally when user consents
 */

export interface AnalyticsData {
  // App usage
  totalSessions: number;
  totalVoiceRecordings: number;
  totalTextEntries: number;
  totalEntries: number;
  
  // Performance metrics
  averageVoiceLatency: number;
  averageAppStartTime: number;
  averageMemoryUsage: number;
  
  // Feature usage
  featuresUsed: {
    voiceRecording: number;
    textEntry: number;
    voiceToText: number;
    exportData: number;
    deleteEntry: number;
    searchEntries: number;
  };
  
  // Time-based data
  firstUsed: string;
  lastUsed: string;
  mostActiveDay: string;
  mostActiveHour: number;
  
  // Writing patterns
  averageEntryLength: number;
  longestEntry: number;
  shortestEntry: number;
  entriesPerDay: number;
  
  // Voice vs Text preference
  voicePercentage: number;
  textPercentage: number;
}

export interface AnalyticsEvent {
  type: string;
  data: any;
  timestamp: string;
  sessionId: string;
}

class AnalyticsCollector {
  private static instance: AnalyticsCollector;
  private readonly STORAGE_KEY = 'heijo-analytics-data';
  private readonly EVENTS_KEY = 'heijo-analytics-events';
  private sessionId: string;
  private currentSession: AnalyticsEvent[] = [];
  private analyticsData: AnalyticsData | null = null;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): AnalyticsCollector {
    if (!AnalyticsCollector.instance) {
      AnalyticsCollector.instance = new AnalyticsCollector();
    }
    return AnalyticsCollector.instance;
  }

  /**
   * Initialize analytics collection
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Load existing analytics data
    await this.loadAnalyticsData();
    
    // Track app start
    this.trackEvent('app_start', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language
    });
  }

  /**
   * Track an analytics event
   */
  trackEvent(type: string, data: any = {}): void {
    if (typeof window === 'undefined') return;
    
    // Check if analytics consent is given
    const consent = this.getAnalyticsConsent();
    if (!consent) return;

    const event: AnalyticsEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    this.currentSession.push(event);
    this.updateAnalyticsData(event);
    this.saveAnalyticsData();
  }

  /**
   * Get analytics data for dashboard
   */
  getAnalyticsData(): AnalyticsData | null {
    return this.analyticsData;
  }

  /**
   * Check if analytics consent is given
   */
  private getAnalyticsConsent(): boolean {
    try {
      const consent = localStorage.getItem('heijo-consent-settings');
      if (consent) {
        const parsed = JSON.parse(consent);
        return parsed.analytics === true;
      }
    } catch (error) {
      console.warn('Failed to check analytics consent:', error);
    }
    return false;
  }

  /**
   * Load analytics data from storage
   */
  private async loadAnalyticsData(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.analyticsData = JSON.parse(stored);
      } else {
        this.analyticsData = this.getDefaultAnalyticsData();
      }
    } catch (error) {
      console.warn('Failed to load analytics data:', error);
      this.analyticsData = this.getDefaultAnalyticsData();
    }
  }

  /**
   * Save analytics data to storage
   */
  private saveAnalyticsData(): void {
    if (!this.analyticsData) return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.analyticsData));
    } catch (error) {
      console.warn('Failed to save analytics data:', error);
    }
  }

  /**
   * Update analytics data based on event
   */
  private updateAnalyticsData(event: AnalyticsEvent): void {
    if (!this.analyticsData) {
      this.analyticsData = this.getDefaultAnalyticsData();
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.getHours();

    switch (event.type) {
      case 'app_start':
        this.analyticsData.totalSessions++;
        this.analyticsData.lastUsed = now.toISOString();
        if (!this.analyticsData.firstUsed) {
          this.analyticsData.firstUsed = now.toISOString();
        }
        break;

      case 'voice_recording_start':
        this.analyticsData.featuresUsed.voiceRecording++;
        break;

      case 'voice_recording_complete':
        this.analyticsData.totalVoiceRecordings++;
        this.analyticsData.totalEntries++;
        // Also increment feature counter when recording completes (not just on start)
        // This ensures featuresUsed.voiceRecording matches actual completed recordings
        if (this.analyticsData.featuresUsed.voiceRecording === 0 || 
            this.analyticsData.featuresUsed.voiceRecording < this.analyticsData.totalVoiceRecordings) {
          this.analyticsData.featuresUsed.voiceRecording = this.analyticsData.totalVoiceRecordings;
        }
        if (event.data.latency) {
          this.updateAverageLatency(event.data.latency);
        }
        break;

      case 'text_entry_save':
        this.analyticsData.totalTextEntries++;
        this.analyticsData.totalEntries++;
        this.analyticsData.featuresUsed.textEntry++; // Increment text entry feature counter
        if (event.data.length) {
          this.updateEntryLengthStats(event.data.length);
        }
        break;

      case 'voice_to_text_used':
        this.analyticsData.featuresUsed.voiceToText++;
        break;

      case 'export_data':
        this.analyticsData.featuresUsed.exportData++;
        break;

      case 'delete_entry':
        this.analyticsData.featuresUsed.deleteEntry++;
        break;

      case 'search_entries':
        this.analyticsData.featuresUsed.searchEntries++;
        break;

      case 'performance_metric':
        if (event.data.metric === 'app_start_time') {
          this.updateAverageAppStartTime(event.data.value);
        } else if (event.data.metric === 'memory_usage') {
          this.updateAverageMemoryUsage(event.data.value);
        }
        break;
    }

    // Update daily/hourly patterns
    this.updateTimePatterns(today, hour);
    
    // Update voice vs text percentages
    this.updateVoiceTextPercentages();
    
    // Update entries per day
    this.updateEntriesPerDay();
  }

  /**
   * Update average voice latency
   */
  private updateAverageLatency(latency: number): void {
    if (this.analyticsData) {
      const current = this.analyticsData.averageVoiceLatency;
      const count = this.analyticsData.totalVoiceRecordings;
      this.analyticsData.averageVoiceLatency = 
        (current * (count - 1) + latency) / count;
    }
  }

  /**
   * Update average app start time
   */
  private updateAverageAppStartTime(startTime: number): void {
    if (this.analyticsData) {
      const current = this.analyticsData.averageAppStartTime;
      const count = this.analyticsData.totalSessions;
      this.analyticsData.averageAppStartTime = 
        (current * (count - 1) + startTime) / count;
    }
  }

  /**
   * Update average memory usage
   */
  private updateAverageMemoryUsage(memory: number): void {
    if (this.analyticsData) {
      const current = this.analyticsData.averageMemoryUsage;
      const count = this.analyticsData.totalSessions;
      this.analyticsData.averageMemoryUsage = 
        (current * (count - 1) + memory) / count;
    }
  }

  /**
   * Update entry length statistics
   */
  private updateEntryLengthStats(length: number): void {
    if (!this.analyticsData) return;

    // Update average
    const current = this.analyticsData.averageEntryLength;
    const count = this.analyticsData.totalEntries;
    this.analyticsData.averageEntryLength = 
      (current * (count - 1) + length) / count;

    // Update longest/shortest
    if (length > this.analyticsData.longestEntry) {
      this.analyticsData.longestEntry = length;
    }
    if (this.analyticsData.shortestEntry === 0 || length < this.analyticsData.shortestEntry) {
      this.analyticsData.shortestEntry = length;
    }
  }

  /**
   * Update time patterns (most active day/hour)
   */
  private updateTimePatterns(today: string, hour: number): void {
    if (!this.analyticsData) return;

    // This is simplified - in a real implementation you'd track daily/hourly usage
    this.analyticsData.mostActiveDay = today;
    this.analyticsData.mostActiveHour = hour;
  }

  /**
   * Update voice vs text percentages
   */
  private updateVoiceTextPercentages(): void {
    if (!this.analyticsData || this.analyticsData.totalEntries === 0) return;

    this.analyticsData.voicePercentage = 
      (this.analyticsData.totalVoiceRecordings / this.analyticsData.totalEntries) * 100;
    this.analyticsData.textPercentage = 
      (this.analyticsData.totalTextEntries / this.analyticsData.totalEntries) * 100;
  }

  /**
   * Update entries per day
   */
  private updateEntriesPerDay(): void {
    if (!this.analyticsData) return;

    const firstUsed = new Date(this.analyticsData.firstUsed);
    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - firstUsed.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 0) {
      this.analyticsData.entriesPerDay = this.analyticsData.totalEntries / daysDiff;
    }
  }

  /**
   * Get default analytics data
   */
  private getDefaultAnalyticsData(): AnalyticsData {
    return {
      totalSessions: 0,
      totalVoiceRecordings: 0,
      totalTextEntries: 0,
      totalEntries: 0,
      averageVoiceLatency: 0,
      averageAppStartTime: 0,
      averageMemoryUsage: 0,
      featuresUsed: {
        voiceRecording: 0,
        textEntry: 0,
        voiceToText: 0,
        exportData: 0,
        deleteEntry: 0,
        searchEntries: 0
      },
      firstUsed: '',
      lastUsed: '',
      mostActiveDay: '',
      mostActiveHour: 0,
      averageEntryLength: 0,
      longestEntry: 0,
      shortestEntry: 0,
      entriesPerDay: 0,
      voicePercentage: 0,
      textPercentage: 0
    };
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all analytics data
   */
  clearAnalyticsData(): void {
    this.analyticsData = this.getDefaultAnalyticsData();
    this.currentSession = [];
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.EVENTS_KEY);
  }

  /**
   * Export analytics data
   */
  exportAnalyticsData(): AnalyticsData | null {
    return this.analyticsData;
  }
}

export const analyticsCollector = AnalyticsCollector.getInstance();
