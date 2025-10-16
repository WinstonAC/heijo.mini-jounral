/**
 * Performance monitoring and optimization utilities
 * Implements performance budgets, metrics collection, and optimization
 */

import { analyticsCollector } from './analytics';

export interface PerformanceMetrics {
  coldStart: number; // milliseconds
  recordButtonReady: number; // milliseconds
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  bundleSize: number; // KB
  firstContentfulPaint: number; // milliseconds
  largestContentfulPaint: number; // milliseconds
  cumulativeLayoutShift: number;
  firstInputDelay: number; // milliseconds
}

export interface PerformanceBudget {
  coldStart: number; // 1.5s
  recordButtonReady: number; // 1s
  cpuIdle: number; // 5%
  cpuRecording: number; // 35%
  bundleSize: number; // 500KB
  firstContentfulPaint: number; // 1.8s
  largestContentfulPaint: number; // 2.5s
  cumulativeLayoutShift: number; // 0.1
  firstInputDelay: number; // 100ms
}

export interface PerformanceAlert {
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  severity: 'warning' | 'error';
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics | null = null;
  private budget: PerformanceBudget;
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;

  constructor() {
    this.budget = {
      coldStart: 1500,
      recordButtonReady: 1000,
      cpuIdle: 5,
      cpuRecording: 35,
      bundleSize: 500,
      firstContentfulPaint: 1800,
      largestContentfulPaint: 2500,
      cumulativeLayoutShift: 0.1,
      firstInputDelay: 100
    };
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    this.startTime = performance.now();
    await this.setupPerformanceObservers();
    await this.collectInitialMetrics();
    
    // Track performance metrics for analytics
    if (this.metrics) {
      analyticsCollector.trackEvent('performance_metric', {
        metric: 'app_start_time',
        value: this.metrics.coldStart
      });
      
      if (this.metrics.memoryUsage > 0) {
        analyticsCollector.trackEvent('performance_metric', {
          metric: 'memory_usage',
          value: this.metrics.memoryUsage
        });
      }
    }
  }

  /**
   * Start recording performance metrics
   */
  startRecording(): void {
    this.isRecording = true;
    this.startTime = performance.now();
  }

  /**
   * Stop recording and collect metrics
   */
  stopRecording(): PerformanceMetrics | null {
    if (!this.isRecording) return null;

    this.isRecording = false;
    return this.collectMetrics();
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Get performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Check if performance is within budget
   */
  checkBudget(): { withinBudget: boolean; violations: PerformanceAlert[] } {
    if (!this.metrics) {
      return { withinBudget: true, violations: [] };
    }

    const violations: PerformanceAlert[] = [];

    for (const [metric, value] of Object.entries(this.metrics)) {
      const threshold = this.budget[metric as keyof PerformanceBudget];
      if (value > threshold) {
        const alert: PerformanceAlert = {
          metric: metric as keyof PerformanceMetrics,
          value,
          threshold,
          severity: value > threshold * 1.5 ? 'error' : 'warning',
          timestamp: Date.now()
        };
        violations.push(alert);
        this.alerts.push(alert);
      }
    }

    return {
      withinBudget: violations.length === 0,
      violations
    };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    if (!this.metrics) return 0;

    let score = 100;
    const budgetCheck = this.checkBudget();

    for (const violation of budgetCheck.violations) {
      const ratio = violation.value / violation.threshold;
      const penalty = Math.min(20, (ratio - 1) * 20);
      score -= penalty;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Setup performance observers
   */
  private async setupPerformanceObservers(): Promise<void> {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Observe paint metrics
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.updateMetric('firstContentfulPaint', entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Observe LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.updateMetric('largestContentfulPaint', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Observe CLS
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.updateMetric('cumulativeLayoutShift', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Observe FID
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.updateMetric('firstInputDelay', (entry as any).processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('Failed to setup performance observers:', error);
    }
  }

  /**
   * Collect initial performance metrics
   */
  private async collectInitialMetrics(): Promise<void> {
    const metrics: Partial<PerformanceMetrics> = {};

    // Cold start time
    metrics.coldStart = performance.now() - this.startTime;

    // Bundle size (approximate from loaded resources)
    metrics.bundleSize = this.estimateBundleSize();

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }

    // CPU usage (approximate)
    metrics.cpuUsage = await this.measureCPUUsage();

    this.metrics = metrics as PerformanceMetrics;
  }

  /**
   * Collect comprehensive metrics
   */
  private collectMetrics(): PerformanceMetrics {
    if (!this.metrics) {
      this.metrics = {} as PerformanceMetrics;
    }

    // Update dynamic metrics
    this.metrics.cpuUsage = this.measureCPUUsageSync();
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024;
    }

    return this.metrics;
  }

  /**
   * Update a specific metric
   */
  private updateMetric<K extends keyof PerformanceMetrics>(
    metric: K, 
    value: PerformanceMetrics[K]
  ): void {
    if (!this.metrics) {
      this.metrics = {} as PerformanceMetrics;
    }
    this.metrics[metric] = value;
  }

  /**
   * Estimate bundle size from loaded resources
   */
  private estimateBundleSize(): number {
    if (typeof window === 'undefined') return 0;

    let totalSize = 0;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    for (const resource of resources) {
      if (resource.name.includes('_next/static/') || resource.name.includes('.js')) {
        totalSize += resource.transferSize || 0;
      }
    }

    return totalSize / 1024; // Convert to KB
  }

  /**
   * Measure CPU usage asynchronously
   */
  private async measureCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      const startTime = Date.now();

      // Simulate work to measure CPU usage
      setTimeout(() => {
        const end = performance.now();
        const endTime = Date.now();
        const cpuTime = end - start;
        const realTime = endTime - startTime;
        const cpuUsage = (cpuTime / realTime) * 100;
        resolve(Math.min(100, Math.max(0, cpuUsage)));
      }, 100);
    });
  }

  /**
   * Measure CPU usage synchronously
   */
  private measureCPUUsageSync(): number {
    const start = performance.now();
    const startTime = Date.now();

    // Simple CPU-bound operation
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }

    const end = performance.now();
    const endTime = Date.now();
    const cpuTime = end - start;
    const realTime = endTime - startTime;
    const cpuUsage = (cpuTime / realTime) * 100;

    return Math.min(100, Math.max(0, cpuUsage));
  }

  /**
   * Clean up observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Memoize function results
   */
  static memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  /**
   * Lazy load images
   */
  static lazyLoadImages(): void {
    if (typeof window === 'undefined') return;

    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  /**
   * Preload critical resources
   */
  static preloadCriticalResources(): void {
    if (typeof window === 'undefined') return;

    const criticalResources = [
      '/fonts/inter.woff2',
      '/icons/icon-192.svg'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.woff2') ? 'font' : 'image';
      if (resource.endsWith('.woff2')) {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize scroll performance
   */
  static optimizeScroll(): void {
    if (typeof window === 'undefined') return;

    let ticking = false;
    
    const updateScroll = () => {
      // Scroll handling logic here
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();





