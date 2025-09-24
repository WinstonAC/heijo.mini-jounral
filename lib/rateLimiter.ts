/**
 * Client-side rate limiting and anti-automation protection
 * Implements per-device quotas and exponential backoff
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  enableDeviceFingerprinting: boolean;
}

export interface RateLimitState {
  requests: number;
  windowStart: number;
  backoffUntil: number;
  violations: number;
  deviceId: string;
}

export interface ViolationLog {
  timestamp: number;
  type: 'rate_limit' | 'suspicious_pattern' | 'rapid_fire';
  details: string;
  userAgent: string;
  deviceId: string;
}

class RateLimiter {
  private static instance: RateLimiter;
  private config: RateLimitConfig;
  private state: RateLimitState | null = null;
  private violationLog: ViolationLog[] = [];
  private readonly STORAGE_KEY = 'heijo-rate-limit-state';
  private readonly VIOLATION_KEY = 'heijo-violation-log';
  private readonly MAX_VIOLATIONS = 10;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: 100, // 100 requests per window
      windowMs: 60 * 60 * 1000, // 1 hour window
      backoffMultiplier: 2,
      maxBackoffMs: 5 * 60 * 1000, // 5 minutes max backoff
      enableDeviceFingerprinting: true,
      ...config
    };
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Initialize rate limiter with device fingerprinting
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Load existing state
    await this.loadState();
    
    // Generate device ID if needed
    if (!this.state?.deviceId) {
      this.state = {
        requests: 0,
        windowStart: Date.now(),
        backoffUntil: 0,
        violations: 0,
        deviceId: await this.generateDeviceId()
      };
      await this.saveState();
    }

    // Load violation log
    this.loadViolationLog();
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    if (!this.state) {
      await this.initialize();
    }

    if (!this.state) {
      return { allowed: false, reason: 'Rate limiter not initialized' };
    }

    const now = Date.now();

    // Check if in backoff period
    if (now < this.state.backoffUntil) {
      const retryAfter = Math.ceil((this.state.backoffUntil - now) / 1000);
      return { 
        allowed: false, 
        reason: 'Rate limit exceeded, please try again later',
        retryAfter
      };
    }

    // Reset window if expired
    if (now - this.state.windowStart > this.config.windowMs) {
      this.state.requests = 0;
      this.state.windowStart = now;
    }

    // Check if limit exceeded
    if (this.state.requests >= this.config.maxRequests) {
      await this.recordViolation('rate_limit', 'Maximum requests per window exceeded');
      await this.applyBackoff();
      return { 
        allowed: false, 
        reason: 'Rate limit exceeded',
        retryAfter: Math.ceil(this.config.windowMs / 1000)
      };
    }

    // Check for suspicious patterns
    const suspicious = await this.detectSuspiciousPattern();
    if (suspicious) {
      await this.recordViolation('suspicious_pattern', suspicious);
      await this.applyBackoff();
      return { 
        allowed: false, 
        reason: 'Suspicious activity detected',
        retryAfter: Math.ceil(this.config.maxBackoffMs / 1000)
      };
    }

    // Allow request
    this.state.requests++;
    await this.saveState();
    return { allowed: true };
  }

  /**
   * Record a successful request
   */
  async recordRequest(): Promise<void> {
    if (!this.state) return;
    
    this.state.requests++;
    await this.saveState();
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { requests: number; maxRequests: number; windowStart: number; backoffUntil: number } {
    if (!this.state) {
      return { requests: 0, maxRequests: this.config.maxRequests, windowStart: 0, backoffUntil: 0 };
    }

    return {
      requests: this.state.requests,
      maxRequests: this.config.maxRequests,
      windowStart: this.state.windowStart,
      backoffUntil: this.state.backoffUntil
    };
  }

  /**
   * Get violation log (for debugging)
   */
  getViolationLog(): ViolationLog[] {
    return [...this.violationLog];
  }

  /**
   * Clear violation log
   */
  clearViolationLog(): void {
    this.violationLog = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.VIOLATION_KEY);
    }
  }

  /**
   * Generate device fingerprint
   */
  private async generateDeviceId(): Promise<string> {
    if (!this.config.enableDeviceFingerprinting) {
      return 'anonymous';
    }

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.platform
    ];

    const fingerprint = components.join('|');
    const hash = await this.simpleHash(fingerprint);
    return `device_${hash}`;
  }

  /**
   * Simple hash function for device fingerprinting
   */
  private async simpleHash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Detect suspicious patterns
   */
  private async detectSuspiciousPattern(): Promise<string | null> {
    if (this.violationLog.length < 3) return null;

    const recentViolations = this.violationLog.slice(-10);
    const now = Date.now();

    // Check for rapid-fire violations
    const rapidFire = recentViolations.filter(v => now - v.timestamp < 1000).length > 5;
    if (rapidFire) {
      return 'Rapid-fire requests detected';
    }

    // Check for repeated violations
    const repeatedViolations = recentViolations.filter(v => v.type === 'rate_limit').length > 3;
    if (repeatedViolations) {
      return 'Repeated rate limit violations';
    }

    // Check for suspicious user agent patterns
    const userAgents = recentViolations.map(v => v.userAgent);
    const uniqueUserAgents = new Set(userAgents).size;
    if (uniqueUserAgents > 3) {
      return 'Multiple user agents detected';
    }

    return null;
  }

  /**
   * Record a violation
   */
  private async recordViolation(type: ViolationLog['type'], details: string): Promise<void> {
    const violation: ViolationLog = {
      timestamp: Date.now(),
      type,
      details,
      userAgent: navigator.userAgent,
      deviceId: this.state?.deviceId || 'unknown'
    };

    this.violationLog.push(violation);
    
    // Keep only recent violations
    if (this.violationLog.length > this.MAX_VIOLATIONS) {
      this.violationLog = this.violationLog.slice(-this.MAX_VIOLATIONS);
    }

    if (this.state) {
      this.state.violations++;
    }

    await this.saveViolationLog();
  }

  /**
   * Apply exponential backoff
   */
  private async applyBackoff(): Promise<void> {
    if (!this.state) return;

    const currentBackoff = this.state.backoffUntil - Date.now();
    const newBackoff = Math.min(
      currentBackoff * this.config.backoffMultiplier,
      this.config.maxBackoffMs
    );

    this.state.backoffUntil = Date.now() + newBackoff;
    await this.saveState();
  }

  /**
   * Load state from storage
   */
  private async loadState(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = {
          ...parsed,
          windowStart: parsed.windowStart || Date.now(),
          backoffUntil: parsed.backoffUntil || 0,
          violations: parsed.violations || 0
        };
      }
    } catch (error) {
      console.warn('Failed to load rate limit state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private async saveState(): Promise<void> {
    if (typeof window === 'undefined' || !this.state) return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save rate limit state:', error);
    }
  }

  /**
   * Load violation log from storage
   */
  private loadViolationLog(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.VIOLATION_KEY);
      if (stored) {
        this.violationLog = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load violation log:', error);
    }
  }

  /**
   * Save violation log to storage
   */
  private async saveViolationLog(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.VIOLATION_KEY, JSON.stringify(this.violationLog));
    } catch (error) {
      console.warn('Failed to save violation log:', error);
    }
  }
}

export const rateLimiter = RateLimiter.getInstance();





