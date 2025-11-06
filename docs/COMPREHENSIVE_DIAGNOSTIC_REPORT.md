# Comprehensive Diagnostic Report: Heijō Architecture & Behavior

**Date**: 2025-11-05  
**Mode**: Read-Only Analysis  
**Status**: Complete

---

## Executive Summary

This report provides a comprehensive diagnostic of how Heijō currently works across five critical areas:

1. **Auth via Supabase** - How users authenticate and how the app identifies the current email
2. **Local-Storage-First Journaling & History** - Where entries are stored and how History works
3. **Premium Storage / Supabase Storage** - How premium toggle works and when entries sync to Supabase
4. **Onboarding Behavior** - How the welcome overlay appears/disappears per email
5. **Video / Media Storage** - How audio/video files are stored (if at all)

**Key Findings:**
- ✅ **Auth works correctly** - Supabase handles all authentication, session managed via Supabase
- ✅ **Local-storage-first works** - Entries always save to localStorage first, History reads from same source
- ✅ **Premium sync implemented** - Premium toggle enables Supabase sync, existing entries can be migrated
- ✅ **Onboarding is account-based** - Checks Supabase metadata first, then localStorage fallback
- ✅ **No video/audio file storage** - Only Web Speech API transcription, no media files stored

---

## 1. Auth via Supabase

### 1.1 Authentication Files

**Primary Files:**
- `lib/auth.tsx` - AuthProvider context and authentication methods
- `lib/supabaseClient.ts` - Supabase client initialization
- `app/login/page.tsx` - Login/signup UI

### 1.2 How Authentication Works

**Authentication Methods Available:**
1. **Email + Password** (`signIn`, `signUp`)
   - Location: `lib/auth.tsx:57-93`
   - Uses `supabase.auth.signInWithPassword()` and `supabase.auth.signUp()`

2. **Magic Link** (`signInWithMagicLink`)
   - Location: `lib/auth.tsx:95-105`
   - Uses `supabase.auth.signInWithOtp()` with email redirect

3. **Password Reset** (`resetPassword`)
   - Location: `lib/auth.tsx:113-120`
   - Uses `supabase.auth.resetPasswordForEmail()`

**Session Management:**
- **Location**: `lib/auth.tsx:25-55`
- **Initial Session**: `supabase.auth.getSession()` on mount
- **Session Persistence**: Session stored in `localStorage` with key `'heijo_session'` (line 48)
- **Session Updates**: Listens to `supabase.auth.onAuthStateChange()` for real-time updates

### 1.3 How App Identifies Current Email

**Current User Identification:**
- **Source**: `AuthProvider` context (`lib/auth.tsx`)
- **State**: `user: User | null` (line 21)
- **Access**: Via `useAuth()` hook (line 136)
- **User Object**: Contains `user.email`, `user.id`, `user.user_metadata`, etc.

**Flow:**
1. User signs in via `signIn()` or `signInWithMagicLink()`
2. Supabase creates/updates session
3. `onAuthStateChange` fires, updates `user` state in AuthProvider
4. Components access current user via `const { user } = useAuth()`
5. User email available at `user.email`

**Session Persistence:**
- Session stored in `localStorage.getItem('heijo_session')` (line 48)
- Persists across page reloads
- Cleared on `signOut()` (line 110)

**Answer:**
The app knows which email is logged in through:
- Supabase session managed by `AuthProvider`
- `user.email` from the Supabase `User` object
- Session persisted to `localStorage` for resilience

---

## 2. Local-Storage-First Journaling & History

### 2.1 Where Journal Entries Are Stored

**Primary Storage: localStorage**
- **Key Name**: `'heijo-journal-entries'`
- **Location**: `lib/store.ts` → `LocalStorage` class (lines 318-395)
- **Data Structure**: Array of `JournalEntry` objects stored as JSON string
- **Storage Method**: `localStorage.setItem('heijo-journal-entries', JSON.stringify(entries))`

**Entry Structure:**
```typescript
interface JournalEntry {
  id: string;
  created_at: string;
  content: string;
  source: 'text' | 'voice';
  tags: string[];
  user_id?: string;
  sync_status: 'synced' | 'local_only' | 'syncing' | 'error' | 'failed';
  last_synced?: string;
}
```

### 2.2 How Entries Are Saved

**Flow in `lib/store.ts` → `HybridStorage.saveEntry()` (lines 28-84):**

1. **Always saves to localStorage first** (line 37)
   ```typescript
   const localEntry = await this.localStorage.saveEntry(entry);
   ```

2. **Then attempts Supabase sync** (if premium user, lines 40-79)
   - Checks if user is authenticated
   - Checks if `user.user_metadata?.premium === true`
   - If yes, inserts to `journal_entries` table
   - Updates localStorage with synced version (using same ID)

3. **Returns local entry** (line 83)
   - Even if Supabase sync fails, local entry is returned
   - Entry is always available locally

**Flow in `app/journal/page.tsx` → `handleSave()` (lines 73-119):**
- Calls `storage.saveEntry(entry)` (line 84)
- Updates local state: `setEntries(prev => [savedEntry, ...prev])` (line 86)
- Entry is immediately available in UI

**Answer:**
- ✅ Entries are **always written to localStorage** in the free tier
- ✅ Entries are **always written to localStorage first** even for premium users (local-first)
- ✅ Premium users get **additional** Supabase sync after localStorage save

### 2.3 History Button Behavior

**Component**: `components/RecentEntriesDrawer.tsx`

**How it receives entries:**
- Receives `entries` as a prop from `JournalPage` (line 12)
- No direct storage access - relies on parent component

**How it loads entries:**
- `JournalPage` calls `storage.getEntries()` (line 64)
- `storage.getEntries()` → `HybridStorage.getEntries()` → reads from localStorage first (line 88)
- Entries passed to `RecentEntriesDrawer` as props (line 207)

**How it displays entries:**
- Groups entries by time periods (Today, This Week, Past Weeks)
- Filters by search term and tags
- Shows sync status icons (synced, local_only, syncing, error)

**Answer:**
✅ **YES** - If you log in with your email/password on a given browser/profile, write some entries, close the app, come back later, log in again, and click History:

- **You WILL see the same entries** (assuming localStorage has not been cleared)
- History reads from the **same localStorage key** (`'heijo-journal-entries'`) that Composer uses to save entries
- Both use `storage.getEntries()` which prioritizes localStorage

**Verification:**
- Composer saves to: `storage.saveEntry()` → `HybridStorage.saveEntry()` → `LocalStorage.saveEntry()` → `localStorage.setItem('heijo-journal-entries', ...)`
- History reads from: `storage.getEntries()` → `HybridStorage.getEntries()` → `LocalStorage.getEntries()` → `localStorage.getItem('heijo-journal-entries')`
- ✅ **CONSISTENT** - Both use the same storage key and mechanism

---

## 3. Premium Storage / Supabase Storage Behavior

### 3.1 Premium Toggle Location

**Component**: `components/Settings.tsx`

**Premium Toggle:**
- **Location**: Lines 272-282
- **State**: `isPremium` (line 26)
- **Toggle Handler**: `handlePremiumToggle()` (line 78)

**Premium Status Check:**
- **Location**: `lib/premium.ts` → `checkPremiumStatus()` (line 24)
- **Method**: Checks `user.user_metadata?.premium === true`
- **Storage**: Supabase `user_metadata.premium` (boolean)

### 3.2 Premium Activation Flow

**When Premium Toggle is Turned ON:**

1. **If not premium yet** (line 81):
   - Shows upgrade modal (`setShowUpgradeModal(true)`)
   - User clicks "Activate Premium" (line 111)
   - Calls `activatePremium()` (line 117)
   - Updates `user_metadata.premium = true` (line 75 in `lib/premium.ts`)

2. **If already premium** (line 85):
   - Shows sync confirmation modal (`setShowSyncConfirm(true)`)
   - User can choose to sync existing entries (line 134)

**Premium Activation Implementation:**
- **Location**: `lib/premium.ts:63-87`
- **Method**: `activatePremium()`
- **Action**: Updates `user_metadata.premium = true` via `supabase.auth.updateUser()`

### 3.3 When Entries Are Written to Supabase

**Entry Save Flow** (`lib/store.ts` → `HybridStorage.saveEntry()`):

1. **Always saves to localStorage first** (line 37)

2. **Then checks for premium** (lines 40-79):
   ```typescript
   if (supabase && isSupabaseConfigured()) {
     const { data: { user } } = await supabase.auth.getUser();
     if (user) {
       const premium = user.user_metadata?.premium;
       if (premium === true) {
         // Insert to Supabase journal_entries table
         const { data, error } = await supabase
           .from('journal_entries')
           .insert([{ ...entry, user_id: user.id }])
           .select()
           .single();
         
         // Update localStorage with synced version
         await this.localStorage.saveEntry({ ...data, id: data.id });
       }
     }
   }
   ```

**Answer:**
- ✅ **Future entries get written to Supabase** (in addition to localStorage) when premium is active
- ✅ **Entries are NOT written to Supabase instead of localStorage** - they're written to both
- ✅ **Local-first strategy** - localStorage is always primary, Supabase is secondary sync

### 3.4 Migration of Existing Local Entries

**Sync Existing Entries Flow:**

**Location**: `components/Settings.tsx:134-150`

**When Premium is Activated:**
1. User activates premium (line 111)
2. Sync confirmation modal appears (line 130)
3. User chooses to sync (line 137)
4. Calls `storage.syncLocalEntries()` (line 141)

**Sync Implementation** (`lib/store.ts` → `HybridStorage.syncLocalEntries()`):

**Location**: Lines 183-240

**Process:**
1. Checks if user has premium (line 194)
2. Gets all localStorage entries (line 200)
3. Filters for `sync_status === 'local_only'` entries (line 201)
4. For each local-only entry:
   - Inserts to Supabase `journal_entries` table (line 215)
   - Updates localStorage entry with `sync_status: 'synced'` (line 223)

**Answer:**
- ✅ **YES** - When premium toggle is turned on, the app **does attempt to upload existing local entries** to Supabase
- ✅ User is **prompted** to choose whether to sync existing entries (line 134)
- ✅ Sync happens via `storage.syncLocalEntries()` which uploads all `local_only` entries

### 3.5 Summary: Premium Storage Behavior

**Current Implementation:**
- ✅ Premium toggle exists in Settings UI
- ✅ Premium status stored in `user_metadata.premium`
- ✅ Entries save to **both** localStorage and Supabase when premium is active
- ✅ Existing local entries can be migrated to Supabase via sync confirmation
- ✅ Local-first strategy maintained (localStorage always primary)

**Matches Intended Flow:**
- ✅ Default: save entries to localStorage
- ✅ After premium toggle: existing history can be saved to Supabase, and new entries also persist there
- ✅ Local-first: entries always save to localStorage first, then sync to Supabase

---

## 4. Onboarding Behavior (Per Email)

### 4.1 Onboarding Logic Location

**Component**: `components/Composer.tsx`

**State Variables:**
- `showWelcomeOverlay` (line 49): Controls visibility of welcome overlay
- `hasSeenWelcome` (line 50): Prevents prompt logic from running until welcome is dismissed

**Welcome Overlay Rendering:**
- Lines 607-684: Renders welcome overlay inside journal editor
- Includes "Welcome to Heijō", tagline, Settings instructions, privacy promise
- **No "Get started" button** (removed in recent update)

### 4.2 Onboarding Decision Logic

**Location**: `components/Composer.tsx:59-130`

**Priority Order:**

1. **First: Check Supabase user metadata** (lines 64-94)
   ```typescript
   if (supabase && isSupabaseConfigured() && userId) {
     const { data: { user } } = await supabase.auth.getUser();
     if (user) {
       const hasSeenOnboarding = user.user_metadata?.has_seen_onboarding === true;
       if (hasSeenOnboarding) {
         // Don't show overlay
         return;
       }
     }
   }
   ```

2. **Second: Check localStorage** (lines 96-118)
   ```typescript
   const hasSeenLocal = localStorage.getItem('heijo_hasSeenWelcome');
   if (hasSeenLocal === 'true') {
     // Don't show overlay
     // Queue update to Supabase
   } else {
     // Show welcome overlay
   }
   ```

**Answer:**
- ✅ **Priority**: Supabase metadata **first**, then localStorage fallback
- ✅ **Storage**: Onboarding completion stored in **both**:
  - `localStorage.getItem('heijo_hasSeenWelcome')` (string: `'true'`)
  - `user_metadata.has_seen_onboarding` (boolean: `true`)

### 4.3 Onboarding Dismissal

**Location**: `components/Composer.tsx:154-186`

**When Welcome is Dismissed:**
1. Updates localStorage: `localStorage.setItem('heijo_hasSeenWelcome', 'true')` (line 159)
2. Updates Supabase: `user_metadata.has_seen_onboarding = true` (line 169)
3. Updates local state: `setShowWelcomeOverlay(false)`, `setHasSeenWelcome(true)` (lines 184-185)

**Dismissal Triggers:**
- User clicks anywhere on overlay (line 618)
- User starts typing (lines 188-192)

### 4.4 Behavior Matrix

**First sign-in for a new email:**
- ✅ **Welcome message IS shown**
- Supabase metadata: `has_seen_onboarding` is `undefined` or `false`
- localStorage: `heijo_hasSeenWelcome` is `null`
- Result: Shows welcome overlay

**Subsequent sign-ins with same email:**

**Same browser/profile:**
- ❌ **Welcome message is NOT shown**
- localStorage: `heijo_hasSeenWelcome === 'true'`
- Result: Skips Supabase check, uses localStorage, no overlay

**Different browser/device:**
- ❌ **Welcome message is NOT shown** (if Supabase metadata exists)
- Supabase metadata: `has_seen_onboarding === true`
- Result: Checks Supabase first, finds `true`, skips overlay

**Incognito, while logged in with same email:**
- ❌ **Welcome message is NOT shown** (if Supabase metadata exists)
- Supabase metadata: `has_seen_onboarding === true`
- localStorage: Empty (incognito has separate storage)
- Result: Checks Supabase first, finds `true`, skips overlay

**User clears localStorage but keeps logging in with same email:**
- ❌ **Welcome message is NOT shown**
- Supabase metadata: `has_seen_onboarding === true`
- localStorage: Cleared (empty)
- Result: Checks Supabase first, finds `true`, skips overlay

### 4.5 Comparison to Desired Rule

**Desired Rule:**
> "Show welcome the first time a new email signs in via Supabase. Never show again for that email."

**Current Behavior:**
- ✅ **MATCHES** - Shows welcome on first sign-in for new email
- ✅ **MATCHES** - Never shows again for that email (checks Supabase metadata first)
- ✅ **MATCHES** - Works across devices/browsers (Supabase is account-based)

**Answer:**
✅ **Current implementation matches the desired rule**. Onboarding is account-based (per email), not device-based.

---

## 5. Video / Media Storage

### 5.1 Audio/Video Recording Components

**Component**: `components/MicButton.tsx`

**Recording Method:**
- Uses **Web Speech API** (`window.SpeechRecognition` or `window.webkitSpeechRecognition`)
- **No MediaRecorder** - Does not record audio files
- **No file storage** - Only real-time transcription

**Implementation:**
- Location: `lib/voiceToText.ts` (referenced in MicButton.tsx:4)
- Uses `enhancedMicButton` from `@/lib/voiceToText`
- Streams transcription in real-time (500ms chunks)
- No audio file creation or storage

### 5.2 Storage Search Results

**Searched for:**
- `supabase.storage`, `storage.from`, `bucket`
- `MediaRecorder`, `video`, `audio.*file`, `.mp3`, `.mp4`, `.wav`

**Findings:**
- ❌ **No Supabase storage bucket usage** - No calls to `supabase.storage.from()`
- ❌ **No MediaRecorder usage** - No audio/video file recording
- ❌ **No file uploads** - No evidence of media file storage
- ✅ **Only Web Speech API** - Real-time transcription only

**Video Files Found:**
- `public/videos/README.md` - References `space.mp4` for intro animation background
- **Not related to journaling** - Only for UI intro animation

### 5.3 Current Media Flow

**Voice Journaling Flow:**
1. User clicks mic button
2. `MicButton` requests microphone permission
3. `enhancedMicButton.startListening()` starts Web Speech API
4. Real-time transcription streamed to `Composer`
5. Transcription text saved as journal entry (text content)
6. **No audio file is created or stored**

**Storage:**
- **Transcription text** → Saved to localStorage (as text entry)
- **No audio file** → No file storage anywhere
- **No video files** → No video recording or storage

### 5.4 Free vs Premium Behavior

**Current Implementation:**
- ✅ **Consistent for both tiers** - No media files stored for either free or premium
- ✅ **Only text storage** - Voice entries stored as transcribed text, not audio files
- ✅ **No Supabase storage buckets** - No file storage in Supabase

**Answer:**
- ❌ **No media files stored** in localStorage, IndexedDB, or Supabase storage buckets
- ✅ **No different behavior** between free vs premium for media (neither stores media files)
- ✅ **Consistent with local-storage-first** - Only text content is stored, not media files

### 5.5 Summary: Video / Media Storage

**Current Implementation:**
- ✅ **No video/audio file storage** - Only Web Speech API transcription
- ✅ **No Supabase storage buckets** - No file uploads to Supabase
- ✅ **No localStorage media files** - Only text content stored
- ✅ **No IndexedDB media files** - No media file storage

**Consistency:**
- ✅ **Consistent with free vs premium model** - Neither tier stores media files
- ✅ **Consistent with local-storage-first** - Only text content is stored locally

---

## 6. Mismatch vs Intended Flow

### 6.1 Intended Design

**Desired Architecture:**
1. Auth in Supabase for all users
2. Local-storage-first for journal entries by default
3. Premium toggle → sync to Supabase
4. Onboarding shown once per email, never again

### 6.2 Current Implementation vs Intended

**✅ MATCHES:**

1. **Auth in Supabase for all users**
   - ✅ All authentication via Supabase (`lib/auth.tsx`)
   - ✅ Session managed by Supabase
   - ✅ Works for all users (free and premium)

2. **Local-storage-first for journal entries by default**
   - ✅ Entries always save to localStorage first (`lib/store.ts:37`)
   - ✅ Supabase sync only if premium active
   - ✅ Free tier uses localStorage only

3. **Premium toggle → sync to Supabase**
   - ✅ Premium toggle exists in Settings (`components/Settings.tsx:272-282`)
   - ✅ When premium active, entries sync to Supabase (`lib/store.ts:40-79`)
   - ✅ Existing entries can be migrated (`components/Settings.tsx:134-150`)

4. **Onboarding shown once per email, never again**
   - ✅ Checks Supabase metadata first (`components/Composer.tsx:64-94`)
   - ✅ Account-based, not device-based
   - ✅ Works across devices/browsers

**⚠️ NO MISMATCHES FOUND**

All four intended behaviors are correctly implemented.

### 6.3 Additional Findings

**Not Part of Intended Design (But Working Correctly):**

1. **Session Persistence**
   - Session stored in `localStorage` (`lib/auth.tsx:48`)
   - Not explicitly mentioned in intended design, but works correctly

2. **Hybrid Storage Merge Strategy**
   - When premium active, entries merged from both localStorage and Supabase (`lib/store.ts:104-127`)
   - Local entries prioritized over cloud entries
   - Not explicitly mentioned, but logical implementation

3. **No Media File Storage**
   - Only Web Speech API transcription, no audio/video files
   - Not explicitly mentioned in intended design, but consistent with privacy-first approach

---

## 7. Summary

### 7.1 Auth via Supabase ✅

- **Files**: `lib/auth.tsx`, `lib/supabaseClient.ts`, `app/login/page.tsx`
- **Methods**: Email/password, magic link, password reset
- **Session**: Managed by Supabase, persisted to `localStorage`
- **Current Email**: Available via `user.email` from `useAuth()` hook

### 7.2 Local-Storage-First Journaling & History ✅

- **Storage Key**: `'heijo-journal-entries'` in localStorage
- **Data Structure**: Array of `JournalEntry` objects (JSON string)
- **History**: Reads from same localStorage key as Composer
- **Persistence**: Entries persist across sessions (same browser/profile)
- **Answer**: ✅ Returning users see all previous entries in History

### 7.3 Premium Storage / Supabase Storage ✅

- **Toggle Location**: `components/Settings.tsx`
- **Premium Status**: Stored in `user_metadata.premium`
- **Entry Sync**: When premium active, entries save to both localStorage and Supabase
- **Migration**: Existing local entries can be synced to Supabase
- **Strategy**: Local-first, Supabase secondary

### 7.4 Onboarding Behavior ✅

- **Location**: `components/Composer.tsx`
- **Priority**: Supabase metadata first, localStorage fallback
- **Storage**: Both `user_metadata.has_seen_onboarding` and `localStorage.getItem('heijo_hasSeenWelcome')`
- **Behavior**: Account-based (per email), works across devices/browsers
- **Answer**: ✅ Shows once per email, never again

### 7.5 Video / Media Storage ✅

- **Recording**: Web Speech API only (no MediaRecorder)
- **Storage**: No audio/video files stored
- **Transcription**: Only text content saved to localStorage
- **Answer**: ✅ No media file storage in localStorage, IndexedDB, or Supabase buckets

### 7.6 Overall Assessment

**✅ All intended behaviors are correctly implemented.**

- Auth works via Supabase
- Local-storage-first journaling works
- Premium toggle enables Supabase sync
- Onboarding is account-based (per email)
- No media file storage (only text transcription)

**No mismatches found between current implementation and intended design.**

---

**End of Diagnostic Report**

This report is read-only and does not include any code changes. All findings are based on static code analysis of the current codebase.

