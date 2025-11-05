# Notifications & Reminders Implementation Guide

## 📋 Industry Standards & Best Practices

### What Top Journaling Apps Do

**Most Popular Apps:**
- **Day One**: Daily push notifications (customizable time), email reminders
- **Journey**: Smart reminders based on writing patterns, push + email
- **Diary.com**: Daily reminders at preferred time, email fallback
- **Penzu**: Email reminders, optional push notifications
- **Grid Diary**: Daily push notifications with customizable frequency

### Industry Standards

1. **Opt-In Only** ✅
   - Always ask for permission first
   - Clear explanation of benefits
   - Easy opt-out anytime

2. **Frequency Management** ✅
   - Daily reminders: 1 per day max
   - Weekly reminders: 1 per week max
   - Smart timing: Respect user's timezone
   - Quiet hours: 9 PM - 8 AM (no notifications)

3. **Multi-Channel** ✅
   - **Push notifications** (primary)
   - **Email notifications** (fallback)
   - **In-app notifications** (when app is open)

4. **Personalization** ✅
   - Customizable reminder times
   - Frequency control (daily/weekly/off)
   - Smart reminders (skip if already journaled today)

5. **Privacy-First** ✅
   - No tracking of notification open rates (privacy-first)
   - Local-first preference storage
   - Opt-out removes all data

---

## 🏗️ Architecture Overview

### Three-Tier Notification System

```
1. Browser Push Notifications (Web Push API)
   └─> Service Worker handles background notifications
   
2. Email Notifications (Supabase Email)
   └─> Fallback for users who decline push
   
3. In-App Notifications (Browser Notification API)
   └─> When app is open and active
```

### Data Flow

```
User Settings → LocalStorage → Supabase (if premium)
                ↓
Notification Manager → Service Worker → Push API
                ↓
Email Service (if enabled)
```

---

## 📊 Database Schema

### New Table: `user_notification_preferences`

```sql
-- Create user notification preferences table
CREATE TABLE user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Push notifications
  push_enabled BOOLEAN DEFAULT false,
  push_subscription JSONB, -- Web Push subscription object
  push_permission_granted BOOLEAN DEFAULT false,
  
  -- Email notifications
  email_enabled BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  
  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TIME, -- e.g., "20:00" (8 PM)
  reminder_timezone TEXT DEFAULT 'UTC',
  reminder_frequency TEXT DEFAULT 'daily' CHECK (reminder_frequency IN ('daily', 'weekly', 'off')),
  
  -- Smart features
  smart_skip_enabled BOOLEAN DEFAULT true, -- Skip if already journaled today
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '21:00', -- 9 PM
  quiet_hours_end TIME DEFAULT '08:00', -- 8 AM
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  notification_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own preferences
CREATE POLICY "Users can manage own notification preferences" 
  ON user_notification_preferences
  FOR ALL 
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_notification_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_notification_prefs_enabled ON user_notification_preferences(reminder_enabled, push_enabled) 
  WHERE reminder_enabled = true OR push_enabled = true;
CREATE INDEX idx_notification_prefs_reminder_time ON user_notification_preferences(reminder_time, reminder_timezone)
  WHERE reminder_enabled = true;
```

---

## 🛠️ Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Notification Manager Library (`lib/notifications.ts`)

**Features:**
- Request notification permission
- Manage push subscription
- Send test notifications
- Check if user has journaled today (smart skip)
- Store preferences locally first, sync to Supabase if premium

#### 1.2 Service Worker (`public/sw.js`)

**Features:**
- Handle push notifications
- Background sync for reminders
- Show notification when app is closed
- Handle notification clicks

#### 1.3 Email Service (Supabase Edge Function)

**Features:**
- Send reminder emails
- Handle email preferences
- Template-based emails

### Phase 2: UI Components

#### 2.1 Notification Settings (`components/NotificationSettings.tsx`)

**Features:**
- Toggle push notifications
- Toggle email notifications
- Set reminder time
- Set frequency (daily/weekly/off)
- Test notifications
- Smart skip toggle
- Quiet hours settings

#### 2.2 Permission Request Modal (`components/NotificationPermissionModal.tsx`)

**Features:**
- Explain benefits
- Request permission
- Handle denied permission gracefully
- Offer email fallback

### Phase 3: Backend Integration

#### 3.1 Supabase Edge Function: `send-reminder`

**Features:**
- Scheduled function (cron job)
- Check users who should receive reminders
- Send push notifications
- Send email notifications
- Update `last_notification_sent`

---

## 📝 Code Implementation

### 1. Notification Manager (`lib/notifications.ts`)

```typescript
export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  reminder_enabled: boolean;
  reminder_time: string; // "HH:mm" format
  reminder_timezone: string;
  reminder_frequency: 'daily' | 'weekly' | 'off';
  smart_skip_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export class NotificationManager {
  // Request browser permission
  async requestPermission(): Promise<NotificationPermission>
  
  // Subscribe to push notifications
  async subscribeToPush(): Promise<PushSubscription | null>
  
  // Check if user has journaled today (smart skip)
  async hasJournaledToday(userId: string): Promise<boolean>
  
  // Send test notification
  async sendTestNotification(): Promise<void>
  
  // Save preferences (local-first, sync if premium)
  async savePreferences(prefs: Partial<NotificationPreferences>): Promise<void>
  
  // Get preferences
  async getPreferences(userId: string): Promise<NotificationPreferences>
  
  // Check if reminder should be sent (respects quiet hours, smart skip)
  async shouldSendReminder(userId: string): Promise<boolean>
}
```

### 2. Service Worker (`public/sw.js`)

```javascript
// Register service worker
// Handle push events
// Show notifications
// Handle notification clicks
```

### 3. Settings UI Integration

Add notification settings section to `components/Settings.tsx`:
- Toggle switches
- Time picker
- Frequency selector
- Test button

---

## 🔔 Notification Content

### Push Notification Templates

**Daily Reminder:**
```
Title: "Time to reflect with Heijō"
Body: "Your daily journaling reminder. Tap to write your entry."
Icon: /icon-192.svg
```

**Weekly Reminder:**
```
Title: "Weekly Reflection Check-in"
Body: "How was your week? Capture your thoughts in Heijō."
Icon: /icon-192.svg
```

**Smart Skip (if already journaled):**
```
Title: "Great job journaling today! 🎉"
Body: "You've already written today. Keep up the momentum!"
Icon: /icon-192.svg
```

### Email Templates

**Daily Reminder Email:**
```
Subject: "Your Daily Heijō Reminder"
Body: 
  "Hi [Name],
  
  It's time for your daily reflection. 
  [Daily Prompt if applicable]
  
  Write your entry: [Link to app]
  
  You're receiving this because you enabled email reminders.
  [Unsubscribe link]"
```

---

## ⚙️ Configuration

### Environment Variables

```env
# VAPID Keys for Web Push (required for push notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:support@heijo.io

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### VAPID Key Generation

```bash
# Generate VAPID keys using web-push library
npx web-push generate-vapid-keys
```

---

## 🧪 Testing Checklist

- [ ] Request notification permission
- [ ] Subscribe to push notifications
- [ ] Receive test notification
- [ ] Test daily reminder at set time
- [ ] Test smart skip (no notification if already journaled)
- [ ] Test quiet hours (no notifications during quiet hours)
- [ ] Test email fallback
- [ ] Test opt-out
- [ ] Test timezone handling
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)

---

## 📊 Privacy & Compliance

### GDPR Compliance

- ✅ **Opt-in only**: Explicit consent required
- ✅ **Easy opt-out**: One-click disable
- ✅ **Data minimalization**: Only store necessary data
- ✅ **Data deletion**: Remove all notification data on account deletion
- ✅ **Transparency**: Clear privacy policy about notifications

### Privacy-First Approach

- Preferences stored locally first
- Sync to Supabase only if premium + user opts in
- No tracking of notification open rates
- No analytics on notification interactions
- User controls all notification data

---

## 🚀 Deployment Steps

### 1. Database Setup

```sql
-- Run the SQL schema above in Supabase SQL Editor
```

### 2. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
# Add to .env.local
```

### 3. Deploy Service Worker

- Service worker must be served from root (`/sw.js`)
- Must be served over HTTPS (or localhost for development)

### 4. Create Supabase Edge Function

- Deploy `send-reminder` function
- Set up cron job (Supabase Cron or external scheduler)

### 5. Update PWA Manifest

- Add notification icons
- Ensure service worker registration

---

## 📈 Success Metrics (Optional - Privacy-First)

**Note**: In privacy-first approach, we don't track these by default.

If user opts in to analytics:
- Notification delivery rate
- Notification click-through rate
- Reminder effectiveness (journaling frequency increase)

---

## 🔄 Future Enhancements

### Phase 2 Features

- **Smart Reminders**: Based on writing patterns
- **Habit Streaks**: Remind when streak is at risk
- **Weekly Summaries**: "You wrote 5 entries this week"
- **Prompt-Specific Reminders**: Remind about specific prompts
- **Custom Reminder Messages**: Let users customize message

### Integrations

- **Calendar Integration**: Sync reminders with calendar
- **Smart Watch**: Notifications on Apple Watch / Wear OS
- **Voice Reminders**: "Hey Siri, remind me to journal"

---

## 📚 Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✅ Implementation Checklist

### Core Features
- [ ] Database schema created
- [ ] Notification manager library
- [ ] Service worker implementation
- [ ] Settings UI components
- [ ] Permission request flow
- [ ] Test notification functionality

### Backend
- [ ] Supabase Edge Function for scheduled reminders
- [ ] Email template setup
- [ ] Cron job configuration

### Testing
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Offline behavior
- [ ] Privacy compliance check

### Documentation
- [ ] User-facing documentation
- [ ] Developer documentation
- [ ] Privacy policy update

---

**Status**: Ready for implementation
**Priority**: High (adds stickiness, industry standard)
**Estimated Time**: 2-3 days for full implementation

