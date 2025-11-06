# Diagnostic Report: Local Storage & Onboarding Behavior

**Date**: 2025-11-05  
**Mode**: Read-Only Analysis  
**Status**: Complete

---

## Executive Summary

This report analyzes two critical aspects of Heijō's behavior:

1. **Local Storage & Journal History**: Whether entries persist correctly and are accessible via the History button
2. **Onboarding / "Get Started" UI**: When and why the welcome overlay appears, especially in incognito mode

**Key Findings:**
- ✅ **Local storage works correctly** - Entries are saved to `localStorage` and should persist across sessions
- ⚠️ **Onboarding has issues** - Only checks localStorage, not Supabase metadata, causing it to reappear on new devices/browsers
- ❌ **"Get started" button exists** - User wants this removed in favor of clean textual welcome

---

## 1. Data Storage & History

### 1.1 Where Journal Entries Are Stored

#### Primary Storage: localStorage
- **Key Name**: `'heijo-journal-entries'`
- **Location**: `lib/store.ts` → `LocalStorage` class (lines 318-395)
- **Data Structure**: Array of `JournalEntry` objects stored as JSON string
- **Storage Method**: `localStorage.setItem('heijo-journal-entries', JSON.stringify(entries))`

#### Secondary Storage: Supabase (Premium Only)
- **Table Name**: `journal_entries`
- **Location**: `lib/store.ts` → `SupabaseStorage` class (lines 244-315)
- **Sync Logic**: Only syncs if user has `premium === true` in `user_metadata`
- **Sync Strategy**: Local-first, then merge with Supabase

### 1.2 How Entries Are Saved

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

1. Calls `storage.saveEntry(entry)` (line 84)
2. Updates local state: `setEntries(prev => [savedEntry, ...prev])` (line 86)
3. Entry is immediately available in UI

### 1.3 How Entries Are Read

**Flow in `lib/store.ts` → `HybridStorage.getEntries()` (lines 86-137):**

1. **Always reads from localStorage first** (line 88)
   ```typescript
   const localEntries = await this.localStorage.getEntries();
   ```

2. **Then attempts Supabase merge** (if premium user, lines 91-128)
   - Fetches entries from `journal_entries` table
   - Merges with localStorage entries (local entries take priority)
   - Removes duplicates by `id`
   - Syncs any local-only entries to Supabase

3. **Returns localStorage entries** (line 136)
   - Always returns localStorage entries, even if Supabase fails
   - Falls back gracefully

**Flow in `app/journal/page.tsx` → `loadEntries()` (lines 62-71):**

1. Calls `storage.getEntries()` (line 64)
2. Sets state: `setEntries(loadedEntries)` (line 65)
3. Entries are passed to `RecentEntriesDrawer` as props (line 207)

### 1.4 History Button Behavior

**Component**: `components/RecentEntriesDrawer.tsx`

**How it receives entries:**
- Receives `entries` as a prop from `JournalPage` (line 12)
- No direct storage access - relies on parent component

**How it displays entries:**
- Groups entries by time periods (Today, This Week, Past Weeks)
- Filters by search term and tags
- Shows sync status icons (synced, local_only, syncing, error)

**Key Finding**: History drawer reads from the **same `entries` state** that `JournalPage` loads via `storage.getEntries()`, which prioritizes localStorage. This means:
- ✅ History should show all entries stored in localStorage
- ✅ Entries persist across browser sessions (same browser/profile)
- ✅ Entries are available immediately after reopening the app

### 1.5 Local-Storage-First Verification

**What needs to be true for local-storage-first to work:**

1. ✅ **Entries are saved to localStorage** - Confirmed: `LocalStorage.saveEntry()` writes to `localStorage.setItem('heijo-journal-entries', ...)`
2. ✅ **Entries are read from localStorage** - Confirmed: `HybridStorage.getEntries()` reads from `localStorage.getItem('heijo-journal-entries')`
3. ✅ **History uses same storage** - Confirmed: `RecentEntriesDrawer` receives entries from `JournalPage`, which loads via `storage.getEntries()`

**Does the current implementation guarantee that behavior?**

✅ **YES** - For normal browser sessions:
- Entries are saved to localStorage immediately
- Entries are read from localStorage on app load
- History drawer displays the same entries
- localStorage persists across browser sessions (same browser/profile)

⚠️ **BUT** - There are edge cases:
- If localStorage is cleared, entries are lost (unless synced to Supabase with premium)
- If user switches browsers/devices, entries won't be available (unless synced to Supabase with premium)
- If localStorage quota is exceeded, saves may fail silently

**Are there any conditions where entries might not show in History even if they're stored?**

❌ **NO** - If entries are in localStorage, they will show in History:
- `RecentEntriesDrawer` receives entries as props from `JournalPage`
- `JournalPage` loads entries via `storage.getEntries()`, which reads from localStorage
- No separate storage mechanism for History

⚠️ **However**, entries might not show if:
- localStorage was cleared
- Browser storage quota exceeded
- JSON parsing fails (corrupted data)
- Component hasn't loaded yet (loading state)

### 1.6 Storage Consistency Check

**Composer writes to**: `storage.saveEntry()` → `HybridStorage.saveEntry()` → `LocalStorage.saveEntry()` → `localStorage.setItem('heijo-journal-entries', ...)`

**History reads from**: `storage.getEntries()` → `HybridStorage.getEntries()` → `LocalStorage.getEntries()` → `localStorage.getItem('heijo-journal-entries')`

✅ **CONSISTENT** - Both use the same storage key and mechanism.

---

## 2. Onboarding / "Get Started" / Welcome UI

### 2.1 Location of Onboarding Logic

**Component**: `components/Composer.tsx`

**State Variables:**
- `showWelcomeOverlay` (line 49): Controls visibility of welcome overlay
- `hasSeenWelcome` (line 50): Prevents prompt logic from running until welcome is dismissed

**Welcome Overlay Rendering:**
- Lines 541-654: Renders welcome overlay inside journal editor
- Includes "Welcome to Heijō", tagline, privacy promise, instructions, and **"Get started" button**

**Deleted Components:**
- ❌ `components/OnboardingModal.tsx` - **DELETED** (removed in recent commit)

### 2.2 Conditions for Welcome Overlay Appearance

**Trigger Logic** (`components/Composer.tsx`, lines 59-69):

```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  
  const hasSeen = localStorage.getItem('heijo_hasSeenWelcome');
  if (hasSeen !== 'true') {
    setHasSeenWelcome(false);
    setShowWelcomeOverlay(true);  // ← SHOWS WELCOME
  } else {
    setHasSeenWelcome(true);
  }
}, []);
```

**Welcome overlay appears when:**
1. ✅ Component has mounted (client-side only)
2. ✅ `localStorage.getItem('heijo_hasSeenWelcome')` returns a value that is **NOT** `'true'`
   - This includes: `null`, `undefined`, `''`, `'false'`, or any other value

**Welcome overlay does NOT appear when:**
1. ❌ `localStorage.getItem('heijo_hasSeenWelcome') === 'true'`
2. ❌ Component hasn't mounted yet (SSR)
3. ❌ `showWelcomeOverlay` is manually set to `false`

### 2.3 Dismissal Logic

**Dismissal Handler** (`components/Composer.tsx`, lines 94-119):

```typescript
const handleDismissWelcome = useCallback(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('heijo_hasSeenWelcome', 'true');
    // Also update Supabase user metadata if available
    if (userId) {
      supabase.auth.updateUser({
        data: { has_seen_onboarding: true }
      });
    }
    // Track analytics
    analyticsCollector.trackEvent('onboarding_completed', {...});
  }
  setShowWelcomeOverlay(false);
  setHasSeenWelcome(true);
}, [userId]);
```

**Welcome overlay is dismissed when:**
1. ✅ User clicks "Get started" button → calls `handleDismissWelcome()`
2. ✅ User starts typing → `useEffect` detects `content.trim().length > 0` → auto-dismisses (lines 122-126)

**After dismissal:**
- `localStorage.setItem('heijo_hasSeenWelcome', 'true')` is set
- `user_metadata.has_seen_onboarding = true` is written to Supabase (if authenticated)
- Overlay will **never appear again** for this user (on this device/browser)

### 2.4 Persistence and Cross-Device Behavior

#### localStorage Key: `heijo_hasSeenWelcome`
- **Purpose**: Primary flag for welcome overlay visibility
- **Type**: String (`'true'` or not set)
- **Persistence**: 
  - ✅ Persists across browser sessions (same browser/profile)
  - ✅ Persists across page reloads
  - ✅ Persists across logouts/logins (same device/browser)
  - ❌ Does NOT persist across different browsers/devices
  - ❌ Does NOT persist if localStorage is cleared

#### Supabase User Metadata: `user_metadata.has_seen_onboarding`
- **Purpose**: Cloud backup of welcome completion status
- **Location Written**: `components/Composer.tsx:104` (in `handleDismissWelcome`)
- **Location Read**: ❌ **NOT CURRENTLY READ** - Only written, never checked
- **Persistence**: 
  - ✅ Persists across all devices (if user is authenticated)
  - ✅ Persists across browsers
  - ⚠️ **Currently unused** - Code writes to it but never reads from it

### 2.5 Incognito Behavior Analysis

**What happens in incognito mode:**

1. **First visit in incognito:**
   - localStorage is empty (separate storage in incognito)
   - `localStorage.getItem('heijo_hasSeenWelcome')` returns `null`
   - Condition `hasSeen !== 'true'` is true
   - ✅ **Welcome overlay WILL appear**

2. **Subsequent visit in incognito (same session):**
   - localStorage persists within the same incognito session
   - If user dismissed welcome, `heijo_hasSeenWelcome = 'true'` exists
   - ❌ **Welcome overlay will NOT appear**

3. **New incognito window:**
   - New incognito window = new localStorage
   - `localStorage.getItem('heijo_hasSeenWelcome')` returns `null`
   - ✅ **Welcome overlay WILL appear again**

4. **Incognito + Supabase metadata:**
   - Code writes `has_seen_onboarding = true` to Supabase when dismissed
   - ❌ **But code never checks Supabase metadata** - only checks localStorage
   - Even if user has seen onboarding on another device, incognito will show it again

### 2.6 Cross-Device/Cross-Browser Behavior

**Returning user, same browser:**
- ✅ localStorage exists → `heijo_hasSeenWelcome === 'true'`
- ❌ Welcome overlay does NOT appear

**Returning user, new browser:**
- ❌ localStorage doesn't exist in new browser
- ❌ Code only checks localStorage, not Supabase
- ✅ **Welcome overlay WILL appear** (even though user is returning)

**Returning user, new device:**
- ❌ localStorage doesn't exist on new device
- ❌ Code only checks localStorage, not Supabase
- ✅ **Welcome overlay WILL appear** (even though user is returning)

**Returning user, localStorage cleared:**
- ❌ localStorage cleared → `heijo_hasSeenWelcome` is gone
- ❌ Code only checks localStorage, not Supabase
- ✅ **Welcome overlay WILL appear** (even though user is returning)

### 2.7 Current Welcome Overlay Content

**Current implementation** (`components/Composer.tsx`, lines 569-651):

1. "Welcome to Heijō" (header)
2. "Micro-moments. Macro clarity." (tagline)
3. "Your data is yours. Entries stay on your device unless you turn on cloud sync." (privacy promise)
4. "To adjust reminders and preferences, click the Settings button at the top of the page." (instructions)
5. "When you're ready, start by typing or speaking your first reflection." (optional line)
6. **"Get started" button** ← User wants this removed

**User's desired content:**
- "Welcome to Heijō" + tagline
- Copy that tells them to go to Settings to configure frequency and reminders
- **No "Get started" button** - just clean textual welcome

---

## 3. Behavior Matrix

### 3.1 New User, First Login (Normal Browser)

| Aspect | Behavior |
|--------|----------|
| **Onboarding appears?** | ✅ YES - localStorage is empty, welcome overlay shows |
| **Entries show in History?** | N/A - No entries yet |
| **Storage mechanism** | localStorage only (unless premium) |
| **Persistence** | ✅ Entries persist across sessions |

### 3.2 Returning User, Same Browser

| Aspect | Behavior |
|--------|----------|
| **Onboarding appears?** | ❌ NO - `heijo_hasSeenWelcome === 'true'` exists |
| **Entries show in History?** | ✅ YES - All entries from localStorage are displayed |
| **Storage mechanism** | localStorage (with optional Supabase sync if premium) |
| **Persistence** | ✅ Entries persist across sessions |

### 3.3 Returning User, New Browser/Device

| Aspect | Behavior |
|--------|----------|
| **Onboarding appears?** | ✅ **YES** - localStorage doesn't exist, code doesn't check Supabase |
| **Entries show in History?** | ⚠️ **DEPENDS** - Only if premium and synced to Supabase |
| **Storage mechanism** | New localStorage (empty), Supabase if premium |
| **Persistence** | ⚠️ Entries only persist if synced to Supabase (premium) |

### 3.4 Returning User, Incognito Mode

| Aspect | Behavior |
|--------|----------|
| **Onboarding appears?** | ✅ **YES** - Incognito has separate localStorage, code doesn't check Supabase |
| **Entries show in History?** | ❌ NO - Incognito localStorage is separate, entries not available |
| **Storage mechanism** | Separate incognito localStorage |
| **Persistence** | ❌ Entries don't persist after incognito window closes |

### 3.5 Returning User, localStorage Cleared

| Aspect | Behavior |
|--------|----------|
| **Onboarding appears?** | ✅ **YES** - localStorage cleared, code doesn't check Supabase |
| **Entries show in History?** | ⚠️ **DEPENDS** - Only if premium and synced to Supabase |
| **Storage mechanism** | New localStorage (empty), Supabase if premium |
| **Persistence** | ⚠️ Entries only persist if synced to Supabase (premium) |

---

## 4. Current vs Desired Behavior

### 4.1 Local-Storage-First Journaling

**Desired Behavior:**
- Normal browser session: User can reopen app and see all previous entries via History button
- Incognito: It's okay if entries don't persist, but logic should be consistent

**Current Behavior:**
- ✅ **MATCHES** - Entries are saved to localStorage and persist across sessions
- ✅ **MATCHES** - History button shows all entries from localStorage
- ✅ **MATCHES** - Incognito has separate localStorage (expected behavior)

**Gap Analysis:**
- ✅ **No gaps** - Local-storage-first behavior works as intended

### 4.2 Onboarding / Welcome UI

**Desired Behavior:**
1. Only the **first time a new email signs in**
2. Welcome UX = "Welcome to Heijō" + tagline + instruction to go to Settings
3. **No "Let's get started" or generic start button overlay**
4. Should **not** re-trigger just because user uses new device or cleared localStorage if we can infer they are an existing account

**Current Behavior:**
1. ⚠️ **PARTIALLY MATCHES** - Shows on first visit, but also shows on new devices/browsers even for returning users
2. ✅ **MATCHES** - Has "Welcome to Heijō" + tagline + Settings instruction
3. ❌ **DOES NOT MATCH** - Has "Get started" button (user wants this removed)
4. ❌ **DOES NOT MATCH** - Re-triggers on new device/browser/incognito because it only checks localStorage, not Supabase metadata

**Gap Analysis:**

#### Gap #1: "Get started" Button
- **Current**: Welcome overlay includes a "Get started" button
- **Desired**: Clean textual welcome with no button
- **Impact**: User explicitly doesn't want this button

#### Gap #2: Cross-Device/Browser Detection
- **Current**: Only checks `localStorage.getItem('heijo_hasSeenWelcome')`
- **Desired**: Should check Supabase `user_metadata.has_seen_onboarding` to detect existing accounts
- **Impact**: Returning users see onboarding again on new devices/browsers

#### Gap #3: Incognito Detection
- **Current**: Shows onboarding in incognito because localStorage is empty
- **Desired**: Should check Supabase metadata to avoid showing onboarding to existing users
- **Impact**: Existing users see onboarding in incognito mode

#### Gap #4: localStorage Cleared Detection
- **Current**: Shows onboarding if localStorage is cleared
- **Desired**: Should check Supabase metadata to avoid showing onboarding to existing users
- **Impact**: Existing users see onboarding again if they clear browser data

---

## 5. Summary of Findings

### 5.1 Local Storage & History ✅

**What Works:**
- ✅ Entries are saved to localStorage immediately
- ✅ Entries are read from localStorage on app load
- ✅ History drawer displays all entries from localStorage
- ✅ Entries persist across browser sessions (same browser/profile)
- ✅ Composer and History use the same storage mechanism

**Potential Issues:**
- ⚠️ If localStorage is cleared, entries are lost (unless synced to Supabase with premium)
- ⚠️ If user switches browsers/devices, entries won't be available (unless synced to Supabase with premium)
- ⚠️ No error handling if localStorage quota is exceeded

**Conclusion**: Local-storage-first behavior works correctly for normal browser sessions. History button will show all previous entries as long as localStorage persists.

### 5.2 Onboarding / Welcome UI ⚠️

**What Works:**
- ✅ Welcome overlay appears on first visit
- ✅ Welcome overlay includes desired content (Welcome, tagline, Settings instruction)
- ✅ Welcome overlay dismisses correctly (button click or typing)
- ✅ Welcome overlay doesn't reappear on same browser after dismissal

**What Doesn't Work:**
- ❌ Welcome overlay includes "Get started" button (user wants this removed)
- ❌ Welcome overlay reappears on new devices/browsers (doesn't check Supabase)
- ❌ Welcome overlay reappears in incognito mode (doesn't check Supabase)
- ❌ Welcome overlay reappears if localStorage is cleared (doesn't check Supabase)
- ❌ Supabase `user_metadata.has_seen_onboarding` is written but never read

**Conclusion**: Onboarding logic works for same-browser scenarios but fails for cross-device/browser scenarios because it only checks localStorage and never checks Supabase metadata.

---

## 6. Recommendations (Prose Only)

### 6.1 Local Storage & History

**No changes needed** - The local-storage-first behavior works correctly. History button will show all entries as long as localStorage persists.

**Optional improvements:**
- Add error handling for localStorage quota exceeded
- Add user notification if localStorage is full
- Consider IndexedDB for larger storage capacity

### 6.2 Onboarding / Welcome UI

**Required fixes:**

1. **Remove "Get started" button**
   - Remove the button from welcome overlay
   - Keep dismissal via typing only (or remove dismissal requirement entirely)

2. **Add Supabase metadata check**
   - Check `user.user_metadata?.has_seen_onboarding` before checking localStorage
   - If Supabase says user has seen onboarding, skip welcome overlay
   - This fixes cross-device/browser issues

3. **Check user account age**
   - Consider checking `user.created_at` to determine if user is truly "new"
   - Only show welcome for users created in last 24-48 hours
   - Prevents showing welcome to old accounts that cleared localStorage

4. **Unified onboarding state**
   - Check Supabase first (cross-device), then localStorage (fast fallback)
   - Sync both on dismissal
   - Ensure consistency

**Implementation approach:**
- Update `components/Composer.tsx` welcome overlay logic
- Check Supabase `user_metadata.has_seen_onboarding` in the first `useEffect`
- Remove "Get started" button from welcome overlay JSX
- Keep dismissal via typing (or make it non-blocking)

---

**End of Diagnostic Report**

This report is read-only and does not include any code changes. All findings are based on static code analysis of the current codebase.

