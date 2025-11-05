/**
 * Notification Manager
 * 
 * Handles browser push notifications, email notifications, and reminder preferences
 * Privacy-first: Local-first storage, syncs to Supabase only if premium + opted in
 */

export interface NotificationPreferences {
  push_enabled: boolean;
  push_subscription: PushSubscription | null;
  push_permission_granted: boolean;
  email_enabled: boolean;
  reminder_enabled: boolean;
  reminder_time: string; // "HH:mm" format (24-hour)
  reminder_timezone: string;
  reminder_frequency: 'daily' | 'weekly' | 'off';
  smart_skip_enabled: boolean; // Skip if already journaled today
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "HH:mm"
  quiet_hours_end: string; // "HH:mm"
}

export type NotificationPermission = 'default' | 'granted' | 'denied';

const STORAGE_KEY = 'heijo-notification-preferences';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export class NotificationManager {
  private static instance: NotificationManager;
  private preferences: NotificationPreferences | null = null;

  private constructor() {
    // Load preferences from localStorage
    this.loadPreferences();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Check if browser supports notifications
   */
  isSupported(): boolean {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Get current notification permission status
   */
  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notifications not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission as NotificationPermission;
  }

  /**
   * Register service worker for push notifications
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(
    userId: string
  ): Promise<PushSubscription | null> {
    if (!this.isSupported() || !VAPID_PUBLIC_KEY) {
      return null;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const registration = await this.registerServiceWorker();
    if (!registration) {
      return null;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to preferences
      const prefs = await this.getPreferences(userId);
      prefs.push_subscription = subscription;
      prefs.push_permission_granted = true;
      await this.savePreferences(userId, prefs);

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(userId: string): Promise<void> {
    const prefs = await this.getPreferences(userId);
    
    if (prefs.push_subscription) {
      try {
        await prefs.push_subscription.unsubscribe();
      } catch (error) {
        console.error('Unsubscribe failed:', error);
      }
    }

    prefs.push_subscription = null;
    prefs.push_permission_granted = false;
    await this.savePreferences(userId, prefs);
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<void> {
    const permission = this.getPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    const registration = await this.registerServiceWorker();
    if (!registration) {
      throw new Error('Service worker not registered');
    }

    await registration.showNotification('Heijō Test Notification', {
      body: 'Notifications are working! 🎉',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'test-notification',
      requireInteraction: false,
    });
  }

  /**
   * Check if user has journaled today (for smart skip)
   */
  async hasJournaledToday(userId: string): Promise<boolean> {
    try {
      const { storage } = await import('./store');
      const entries = await storage.getEntries();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.created_at);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
      });

      return todayEntries.length > 0;
    } catch (error) {
      console.error('Error checking journal status:', error);
      return false;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  isQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quiet_hours_enabled) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = prefs.quiet_hours_start.split(':').map(Number);
    const [endHour, endMinute] = prefs.quiet_hours_end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle quiet hours that span midnight (e.g., 21:00 - 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    } else {
      return currentTime >= startTime && currentTime < endTime;
    }
  }

  /**
   * Check if reminder should be sent
   */
  async shouldSendReminder(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Check if reminders are enabled
    if (!prefs.reminder_enabled || prefs.reminder_frequency === 'off') {
      return false;
    }

    // Check quiet hours
    if (this.isQuietHours(prefs)) {
      return false;
    }

    // Check smart skip (if already journaled today)
    if (prefs.smart_skip_enabled) {
      const hasJournaled = await this.hasJournaledToday(userId);
      if (hasJournaled) {
        return false;
      }
    }

    // Check frequency
    if (prefs.reminder_frequency === 'weekly') {
      // Only send on specific day (e.g., Sunday)
      const today = new Date().getDay();
      return today === 0; // Sunday
    }

    // Daily reminder
    return true;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    if (this.preferences) {
      return this.preferences;
    }

    // Load from localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.preferences = {
          ...this.getDefaultPreferences(),
          ...parsed,
        };
        return this.preferences;
      } catch (error) {
        console.error('Error parsing preferences:', error);
      }
    }

    // Try to load from Supabase if premium
    try {
      const { checkPremiumStatus } = await import('./premium');
      const { supabase } = await import('./supabaseClient');
      
      const premium = await checkPremiumStatus();
      if (premium.isPremium) {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (data && !error) {
          this.preferences = {
            ...this.getDefaultPreferences(),
            push_enabled: data.push_enabled || false,
            email_enabled: data.email_enabled || false,
            reminder_enabled: data.reminder_enabled || false,
            reminder_time: data.reminder_time || '20:00',
            reminder_timezone: data.reminder_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            reminder_frequency: data.reminder_frequency || 'daily',
            smart_skip_enabled: data.smart_skip_enabled !== false,
            quiet_hours_enabled: data.quiet_hours_enabled !== false,
            quiet_hours_start: data.quiet_hours_start || '21:00',
            quiet_hours_end: data.quiet_hours_end || '08:00',
            push_subscription: data.push_subscription ? JSON.parse(JSON.stringify(data.push_subscription)) : null,
            push_permission_granted: data.push_permission_granted || false,
          };
          return this.preferences;
        }
      }
    } catch (error) {
      console.error('Error loading preferences from Supabase:', error);
    }

    // Return defaults
    this.preferences = this.getDefaultPreferences();
    return this.preferences;
  }

  /**
   * Save notification preferences (local-first, sync if premium)
   */
  async savePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>
  ): Promise<void> {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...prefs };
    
    // Save to localStorage first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    this.preferences = updated;

    // Sync to Supabase if premium
    try {
      const { checkPremiumStatus } = await import('./premium');
      const { supabase } = await import('./supabaseClient');
      
      const premium = await checkPremiumStatus();
      if (premium.isPremium) {
        const { error } = await supabase
          .from('user_notification_preferences')
          .upsert({
            user_id: userId,
            push_enabled: updated.push_enabled,
            email_enabled: updated.email_enabled,
            reminder_enabled: updated.reminder_enabled,
            reminder_time: updated.reminder_time,
            reminder_timezone: updated.reminder_timezone,
            reminder_frequency: updated.reminder_frequency,
            smart_skip_enabled: updated.smart_skip_enabled,
            quiet_hours_enabled: updated.quiet_hours_enabled,
            quiet_hours_start: updated.quiet_hours_start,
            quiet_hours_end: updated.quiet_hours_end,
            push_subscription: updated.push_subscription ? JSON.parse(JSON.stringify(updated.push_subscription)) : null,
            push_permission_granted: updated.push_permission_granted,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (error) {
          console.error('Error syncing preferences to Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      push_enabled: false,
      push_subscription: null,
      push_permission_granted: false,
      email_enabled: false,
      reminder_enabled: false,
      reminder_time: '20:00', // 8 PM default
      reminder_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reminder_frequency: 'daily',
      smart_skip_enabled: true,
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00', // 9 PM
      quiet_hours_end: '08:00', // 8 AM
    };
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.preferences = JSON.parse(stored);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationManager = NotificationManager.getInstance();

