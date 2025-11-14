'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationManager, NotificationPreferences } from '@/lib/notifications';
import { useAuth } from '@/lib/auth';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      setIsSupported(notificationManager.isSupported());
      setPermissionStatus(notificationManager.getPermission());
      
      const preferences = await notificationManager.getPreferences(user.id);
      setPrefs(preferences);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (!user || !prefs) return;

    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setHasUnsavedChanges(true);
  };

  const handleTimeChange = (key: 'reminder_time' | 'quiet_hours_start' | 'quiet_hours_end', value: string) => {
    if (!user || !prefs) return;
    
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setHasUnsavedChanges(true);
  };

  const handleFrequencyChange = (frequency: 'daily' | 'weekly' | 'off') => {
    if (!user || !prefs) return;
    
    const updated = { ...prefs, reminder_frequency: frequency, reminder_enabled: frequency !== 'off' };
    setPrefs(updated);
    setHasUnsavedChanges(true);
  };

  const handleSaveReminderSettings = async () => {
    if (!user || !prefs) return;

    // Special handling for push notifications if enabling
    if (prefs.push_enabled && permissionStatus !== 'granted') {
      const permission = await notificationManager.requestPermission();
      setPermissionStatus(permission);
      
      if (permission !== 'granted') {
        alert('Notification permission is required for push notifications. Please enable it in your browser settings.');
        return;
      }

      // Subscribe to push
      await notificationManager.subscribeToPush(user.id);
    }

    if (!prefs.push_enabled && permissionStatus === 'granted') {
      // Unsubscribe from push
      await notificationManager.unsubscribeFromPush(user.id);
    }

    await savePreferences(prefs);
    setHasUnsavedChanges(false);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 3000);
  };

  const savePreferences = async (preferences: NotificationPreferences) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await notificationManager.savePreferences(user.id, preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationManager.sendTestNotification();
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification. Please check your browser permissions.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-ui-graphite">Loading notification settings...</p>
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="p-6">
        <p className="text-ui-graphite">Failed to load notification settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-graphite-charcoal mb-4 subheading">
          Reminders & Notifications
        </h3>
        <p className="text-xs text-text-secondary mb-4">
          Get reminded to journal and stay consistent with your practice.
        </p>
      </div>

      {/* Browser Support Warning */}
      {!isSupported && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Your browser doesn&apos;t support push notifications. Email reminders are still available.
          </p>
        </div>
      )}

      {/* Push Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-graphite-charcoal">Push Notifications</div>
            <div className="text-xs text-text-secondary">
              Receive notifications in your browser
            </div>
            {permissionStatus === 'denied' && (
              <div className="text-xs text-red-600 mt-1">
                Permission denied. Enable in browser settings.
              </div>
            )}
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.push_enabled && isSupported}
              onChange={(e) => handleToggle('push_enabled', e.target.checked)}
              disabled={!isSupported || permissionStatus === 'denied'}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal ${(!isSupported || permissionStatus === 'denied') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
          </label>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-graphite-charcoal">Email Notifications</div>
            <div className="text-xs text-text-secondary">
              Receive reminders via email
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.email_enabled}
              onChange={(e) => handleToggle('email_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal"></div>
          </label>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="space-y-4 border-t border-soft-silver pt-4">
        {/* Enable Reminders Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-graphite-charcoal">Enable Reminders</div>
            <div className="text-xs text-text-secondary">
              Turn on to receive daily or weekly reminders
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.reminder_enabled}
              onChange={(e) => {
                handleToggle('reminder_enabled', e.target.checked);
                if (e.target.checked && prefs.reminder_frequency === 'off') {
                  handleFrequencyChange('daily');
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal"></div>
          </label>
        </div>

        {prefs.reminder_enabled && (
          <div className="space-y-4 pl-4 border-l-2 border-graphite-charcoal">
            {/* Frequency Selection */}
            <div>
              <div className="text-sm font-medium text-graphite-charcoal mb-2">Frequency</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFrequencyChange('daily')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    prefs.reminder_frequency === 'daily'
                      ? 'bg-graphite-charcoal text-white'
                      : 'bg-white border border-soft-silver text-graphite-charcoal hover:bg-tactile-taupe'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => handleFrequencyChange('weekly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    prefs.reminder_frequency === 'weekly'
                      ? 'bg-graphite-charcoal text-white'
                      : 'bg-white border border-soft-silver text-graphite-charcoal hover:bg-tactile-taupe'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => handleFrequencyChange('off')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    prefs.reminder_frequency === 'off'
                      ? 'bg-graphite-charcoal text-white'
                      : 'bg-white border border-soft-silver text-graphite-charcoal hover:bg-tactile-taupe'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <div className="text-sm font-medium text-graphite-charcoal mb-2">Reminder Time</div>
              <input
                type="time"
                value={prefs.reminder_time}
                onChange={(e) => handleTimeChange('reminder_time', e.target.value)}
                className="w-full px-4 py-2 border border-soft-silver rounded-lg bg-white text-graphite-charcoal focus:outline-none focus:ring-2 focus:ring-soft-silver"
              />
              <div className="text-xs text-text-secondary mt-1">
                Timezone: {prefs.reminder_timezone}
              </div>
            </div>

            {/* Smart Skip */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-graphite-charcoal">Smart Skip</div>
                <div className="text-xs text-text-secondary">
                  Skip reminder if you&apos;ve already journaled today
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.smart_skip_enabled}
                  onChange={(e) => handleToggle('smart_skip_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal"></div>
              </label>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-graphite-charcoal">Quiet Hours</div>
                  <div className="text-xs text-text-secondary">
                    Don&apos;t send notifications during these hours
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.quiet_hours_enabled}
                    onChange={(e) => handleToggle('quiet_hours_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-tactile-taupe peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-soft-silver rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-soft-silver after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-graphite-charcoal"></div>
                </label>
              </div>

              {prefs.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Start</div>
                    <input
                      type="time"
                      value={prefs.quiet_hours_start}
                      onChange={(e) => handleTimeChange('quiet_hours_start', e.target.value)}
                      className="w-full px-3 py-2 border border-soft-silver rounded-lg bg-white text-graphite-charcoal focus:outline-none focus:ring-2 focus:ring-soft-silver"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-1">End</div>
                    <input
                      type="time"
                      value={prefs.quiet_hours_end}
                      onChange={(e) => handleTimeChange('quiet_hours_end', e.target.value)}
                      className="w-full px-3 py-2 border border-soft-silver rounded-lg bg-white text-graphite-charcoal focus:outline-none focus:ring-2 focus:ring-soft-silver"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Reminder Settings Button */}
      <div className="border-t border-soft-silver pt-4">
        <button
          onClick={handleSaveReminderSettings}
          disabled={!hasUnsavedChanges || isSaving}
          className="w-full px-4 py-3 text-sm font-medium silver-button text-graphite-charcoal hover:bg-tactile-taupe disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-lg mb-4"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {isSaving ? 'Saving...' : 'Save Reminder Settings'}
        </button>
        
        {showSaveConfirmation && (
          <div className="text-sm text-green-600 text-center mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            ✓ Reminder settings saved
          </div>
        )}
        
        {!hasUnsavedChanges && !showSaveConfirmation && (
          <p className="text-xs text-text-secondary text-center mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            All settings are saved
          </p>
        )}
      </div>

      {/* Test Button */}
      {(prefs.push_enabled || prefs.email_enabled) && (
        <div className="border-t border-soft-silver pt-4">
          <button
            onClick={handleTestNotification}
            disabled={!isSupported || permissionStatus !== 'granted'}
            className="w-full px-4 py-2 text-sm font-medium outline-button text-graphite-charcoal hover:bg-tactile-taupe disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-lg"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Send Test Notification
          </button>
        </div>
      )}
    </div>
  );
}

