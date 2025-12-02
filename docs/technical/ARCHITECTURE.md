# Heijō — Architecture Overview

**Last Updated**: 2025-11-05  
**Status**: Production-ready v1.0.0

---

## Executive Summary

Heijō Mini-Journal is a **privacy-first journaling application** built with Next.js 14, React 18, and Supabase. The system uses a **hybrid storage architecture** (localStorage + Supabase) with **zero AI integration** currently. All journaling operations are handled client-side via React components and Supabase client SDK.

**Key Finding:** No API routes exist. All data operations go through Supabase client directly from the browser.

---

## System Context

- **Client-only web app** (Next.js App Router) with optional Supabase sync
- **Local-first data model** with AES-GCM encryption (IndexedDB + localStorage indices)
- **Voice transcription** via Web Speech API
- **Premium tier** for cloud sync (gated behind premium status)

---

## Major Modules

- **Auth/session**: `lib/auth.tsx` (Supabase optional)
- **Storage**: `lib/secureStorage.ts`, `lib/store.ts` (hybrid: localStorage + Supabase)
- **Premium**: `lib/premium.ts` (premium status management)
- **Encryption**: `lib/encryption.ts`
- **Voice**: `lib/voiceToText.ts`
- **GDPR & Analytics**: `lib/gdpr.ts`, `lib/analytics.ts`
- **Notifications**: `lib/notifications.ts` (push notifications, email reminders, notification preferences)

---

## Data Flows

- **Entry create** → encrypt → persist locally → optional background sync to Supabase (if premium)
- **Session changes** → persisted to `localStorage` for resilience
- **Analytics** (local-only) → `localStorage` for dashboard rendering
- **Premium sync** → Only if `user_metadata.premium = true`
- **Notifications** → Preferences stored in Supabase (if premium) or localStorage (free tier)
- **Notification reminders** → Check preferences → Send push/email if conditions met (frequency, quiet hours, smart skip)

---

## Frontend Components

### Core Journaling Components

#### `components/Composer.tsx`
**Primary entry creation interface**
- Auto-save after 7 seconds of inactivity (if content > 10 chars)
- Manual save via Cmd/Ctrl+S or Cmd/Ctrl+Enter
- Voice transcription via `MicButton` component
- Daily prompt display and selection
- Tag picker integration
- Export current entry to CSV

#### `components/RecentEntriesDrawer.tsx`
**Slide-out entry history panel**
- Groups entries by "Today", "This Week", "Past Weeks"
- Expandable entry cards
- Sync status indicators
- Search and tag filtering
- Export all functionality

#### `components/MicButton.tsx`
**Voice recording interface**
- Visual recording state (pulse animation)
- Browser Web Speech API integration
- Real-time transcription streaming
- Error handling for microphone permissions

#### `components/Settings.tsx`
**Settings and privacy controls**
- Data overview (total entries, storage used, oldest/newest entry)
- Consent settings (microphone, local storage, premium cloud sync, analytics)
- Display settings (font size, daily prompt)
- Notification settings (via `NotificationSettings` component)
- Analytics dashboard (via `AnalyticsDashboard` component, conditional on consent)
- Data export (CSV)
- Data deletion with confirmation modal
- Premium toggle (with upgrade modal and sync confirmation)
- Legal links (Privacy Policy, Terms of Service)

#### `components/NotificationSettings.tsx`
**Notification and reminder configuration**
- Push notifications with browser permission handling
- Email notifications toggle
- Reminder frequency (daily/weekly/off)
- Custom reminder time selection
- Smart skip (skip if already journaled today)
- Quiet hours configuration
- Test notification functionality
- Browser support detection

#### `components/AnalyticsDashboard.tsx`
**Usage analytics dashboard**
- Overview metrics (sessions, entries)
- Entry type analysis (voice vs text percentages)
- Performance metrics (voice latency, app start time, memory usage)
- Writing patterns (average length, longest entry)
- Feature usage tracking
- Usage timeline (first used, last used)
- Conditional visibility based on analytics consent

---

## Storage Architecture

### Hybrid Storage Strategy

**Free Tier (localStorage only)**:
- All entries stored in `localStorage` (key: `heijo-journal-entries`)
- Data never leaves device
- Works completely offline

**Premium Tier (localStorage + Supabase)**:
- Entries save to `localStorage` first (local-first)
- If premium active: sync to Supabase cloud database
- Merge strategy: Local entries prioritized, cloud merged
- Conflict resolution: Local version takes precedence

### Storage Backend (`lib/store.ts`)

- **HybridStorage**: Main storage class
  - `saveEntry()`: Saves to localStorage, syncs to Supabase if premium
  - `getEntries()`: Loads from localStorage first, merges with cloud if premium
  - `syncLocalEntries()`: Syncs local-only entries to cloud (premium only)

- **LocalStorage**: Browser storage backend
- **SupabaseStorage**: Cloud storage backend (premium only)

### Premium Gating

```typescript
// Check premium status before Supabase sync
const premium = user.user_metadata?.premium;
if (premium === true) {
  // Enable Supabase sync
  // Merge cloud and local entries
}
```

---

## Authentication

### Supabase Auth
- **Magic link**: Primary authentication method
- **Email/password**: Fallback method
- **Session persistence**: Stored in `localStorage` (`heijo_session`)
- **Password reset**: Forgot password flow implemented

### Session Management
- Session persisted to `localStorage` for resilience
- Auto-rehydration on page load
- Session cleared on logout

---

## Local Storage Keys

- `heijo_session`: Supabase session JSON
- `heijo-journal-entries`: Array of journal entries
- `HeijoSecureStorage`: Encrypted entries/metadata (IndexedDB)
- `heijo-consent-settings`: Consent flags (microphone, storage, analytics)
- `heijo-analytics-data` / `heijo-analytics-events`: Usage metrics
- `heijo-notification-preferences`: Notification preferences (localStorage fallback)
- `heijo-prompt-shown`: Daily prompt dismissal tracking

---

## Premium Features

### Premium Status
- Stored in: `user_metadata.premium` (boolean)
- Testing: Manual activation (free)
- Future: Payment API verification (Chrome/App Store)

### Premium Flow
1. User toggles Premium in Settings
2. Upgrade modal appears (free activation for testing)
3. Sync confirmation modal (sync existing entries or skip)
4. New entries automatically sync to cloud

See `docs/PREMIUM_FEATURES.md` for complete details.

---

## Diagram Notes

Place diagrams under `docs/technical/diagrams/` (PNG/SVG) and keep them source-controlled.

Recommended views:
- **Context**: Browser, Optional Supabase, No third-party APIs (v1)
- **Container**: App (Next.js), Storage (IndexedDB/localStorage), Optional Sync Worker
- **Component**: `Composer`, `MicButton`, `EntryList`, `Settings`

---

## References

- **Database**: `docs/technical/DATABASE.md`
- **Security**: `docs/technical/SECURITY.md`
- **Frontend**: `docs/technical/FRONTEND.md`
- **API & Integrations**: `docs/technical/API.md` (calendar/OAuth: not implemented in v1)
- **Premium Features**: `docs/PREMIUM_FEATURES.md`

---

## Technical Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL) + localStorage
- **Authentication**: Supabase Auth
- **Voice**: Web Speech API (browser-native)
- **Encryption**: Web Crypto API (AES-GCM)
- **Deployment**: Vercel

---

## Not Implemented (Future)

- Google/Microsoft OAuth
- Calendar integration
- Meditation playback
- Enterprise features
- AI/GPT/Gemini integration
