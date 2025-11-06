# Diagnostic Report: "Get Started" Button & Onboarding Flow

**Date**: 2025-11-05  
**Mode**: Read-Only Analysis  
**Status**: Complete

---

## 1. Files and Components Involved

### Primary Components
- **`components/Composer.tsx`** (Lines 49-654)
  - Contains the welcome overlay logic
  - Renders the "Get started" button
  - Manages `showWelcomeOverlay` state

- **`app/journal/page.tsx`** (Lines 1-223)
  - Main journal page that renders `Composer`
  - No onboarding logic (delegated to Composer)
  - Handles authentication redirect

- **`app/login/page.tsx`** (Lines 1-304)
  - Login/signup page
  - Redirects to `/journal` after successful authentication
  - No onboarding logic

### Supporting Files
- **`lib/auth.tsx`** - Authentication provider
- **`lib/analytics.ts`** - Tracks `onboarding_completed` event
- **`lib/supabaseClient.ts`** - Supabase client for user metadata

### Deleted/Removed
- **`components/OnboardingModal.tsx`** - ❌ **DELETED** (removed in recent commit)

---

## 2. User Flow Overview

### New User Flow (First-Time Login)

1. **User visits `/login`** (`app/login/page.tsx`)
   - Enters email/password or uses magic link
   - Submits authentication

2. **Authentication Success** (`lib/auth.tsx`)
   - Supabase authenticates user
   - Session created
   - User object available

3. **Redirect to Journal** (`app/login/page.tsx:54`)
   ```typescript
   setTimeout(() => router.push('/journal'), 1000);
   ```
   - 1-second delay, then navigates to `/journal`

4. **Journal Page Loads** (`app/journal/page.tsx`)
   - Checks authentication (redirects to `/login` if not authenticated)
   - Initializes app (performance, analytics, rate limiting)
   - Loads journal entries
   - Renders `<Composer />` component

5. **Composer Component Mounts** (`components/Composer.tsx`)
   - Initial state: `showWelcomeOverlay = false`, `hasSeenWelcome = true` (default)
   - **First useEffect runs** (Lines 59-69):
     ```typescript
     useEffect(() => {
       if (typeof window === 'undefined') return;
       
       const hasSeen = localStorage.getItem('heijo_hasSeenWelcome');
       if (hasSeen !== 'true') {
         setHasSeenWelcome(false);
         setShowWelcomeOverlay(true);  // ← TRIGGERS WELCOME OVERLAY
       } else {
         setHasSeenWelcome(true);
       }
     }, []);
     ```
   - Checks `localStorage.getItem('heijo_hasSeenWelcome')`
   - **If NOT 'true'**: Sets `showWelcomeOverlay = true`

6. **Welcome Overlay Renders** (Lines 541-654)
   - Absolute positioned overlay inside textarea container
   - Shows "Welcome to Heijō" message
   - Shows "Get started" button
   - Textarea is **disabled** while overlay is visible

7. **User Dismisses Overlay** (Two ways):
   - **Option A**: Clicks "Get started" button → calls `handleDismissWelcome()`
   - **Option B**: Starts typing → `useEffect` detects content change → auto-dismisses

8. **Dismissal Handler** (`handleDismissWelcome`, Lines 94-119):
   - Sets `localStorage.setItem('heijo_hasSeenWelcome', 'true')`
   - Updates Supabase `user_metadata.has_seen_onboarding = true`
   - Tracks analytics event `onboarding_completed`
   - Sets `showWelcomeOverlay = false`
   - Sets `hasSeenWelcome = true`

9. **Prompt Logic Activates** (Lines 72-85):
   - After `hasSeenWelcome = true`, prompt system runs
   - Checks if prompt shown today
   - Shows daily prompt if applicable

### Returning User Flow

1. **User logs in** → Redirects to `/journal`

2. **Composer Component Mounts**
   - First useEffect checks `localStorage.getItem('heijo_hasSeenWelcome')`
   - **Value is 'true'** → `hasSeenWelcome = true`, `showWelcomeOverlay = false`
   - Welcome overlay **does NOT render**

3. **Prompt Logic Runs Immediately** (Lines 72-85)
   - No delay (welcome already seen)
   - Shows daily prompt if applicable

4. **Normal Journaling Experience**
   - Textarea is enabled
   - User can type/speak immediately

---

## 3. Visibility Logic

### State Variables That Control "Get Started" Visibility

#### Primary Control: `showWelcomeOverlay`
- **Location**: `components/Composer.tsx:49`
- **Type**: `boolean`
- **Default**: `false`
- **When Set to `true`**: Welcome overlay (including "Get started" button) appears
- **When Set to `false`**: Welcome overlay hidden, normal journaling view

#### Secondary Control: `hasSeenWelcome`
- **Location**: `components/Composer.tsx:50`
- **Type**: `boolean`
- **Default**: `true` (optimistic default, checked immediately)
- **Purpose**: Prevents prompt logic from running until welcome is dismissed

### Conditions That Trigger Welcome Overlay

**The welcome overlay appears when ALL of these are true:**

1. ✅ Component has mounted (`useEffect` has run)
2. ✅ `localStorage.getItem('heijo_hasSeenWelcome')` returns a value that is **NOT** `'true'`
   - This includes: `null`, `undefined`, `''`, `'false'`, or any other value
3. ✅ `typeof window !== 'undefined'` (client-side only)

**The welcome overlay does NOT appear when:**

1. ❌ `localStorage.getItem('heijo_hasSeenWelcome') === 'true'`
2. ❌ Component hasn't mounted yet (SSR)
3. ❌ `showWelcomeOverlay` is manually set to `false`

### Dismissal Conditions

**Welcome overlay is dismissed when:**

1. ✅ User clicks "Get started" button → `handleDismissWelcome()` called
2. ✅ User starts typing → `content.trim().length > 0` → auto-dismisses via useEffect (Lines 122-126)

**After dismissal:**
- `localStorage.setItem('heijo_hasSeenWelcome', 'true')` is set
- Overlay will **never appear again** for this user (on this device/browser)

---

## 4. Persistence and Local Storage

### LocalStorage Keys Used

#### `heijo_hasSeenWelcome`
- **Purpose**: Primary flag for welcome overlay visibility
- **Type**: String (`'true'` or not set)
- **Location Written**: `components/Composer.tsx:96` (in `handleDismissWelcome`)
- **Location Read**: `components/Composer.tsx:62` (in first `useEffect`)
- **When Written**: 
  - When user clicks "Get started" button
  - When user starts typing (auto-dismiss)
- **When Read**: 
  - On every Composer component mount
  - Only once per mount (in `useEffect` with empty dependency array)
- **Persistence**: 
  - ✅ Persists across browser sessions
  - ✅ Persists across page reloads
  - ✅ Persists across logouts/logins (same device/browser)
  - ❌ Does NOT persist across different browsers/devices
  - ❌ Does NOT persist if localStorage is cleared

#### `heijo-prompt-shown`
- **Purpose**: Tracks if daily prompt was shown today
- **Unrelated to welcome overlay** (but prompt logic is delayed until welcome is dismissed)

### Supabase User Metadata

#### `user_metadata.has_seen_onboarding`
- **Purpose**: Cloud backup of welcome completion status
- **Location Written**: `components/Composer.tsx:104` (in `handleDismissWelcome`)
- **Location Read**: Not currently read (only written)
- **When Written**: When welcome is dismissed (if `userId` exists)
- **Persistence**: 
  - ✅ Persists across all devices (if user is authenticated)
  - ✅ Persists across browsers
  - ⚠️ **Currently NOT used for checking** - only localStorage is checked

### Potential Persistence Issues

**Issue #1: localStorage-only check**
- Welcome overlay only checks `localStorage`, not Supabase metadata
- If user clears browser data, welcome will reappear even if they've seen it on another device
- If user switches browsers, welcome will show again

**Issue #2: No user-specific check**
- Welcome overlay doesn't check if user is "new" (e.g., account created date)
- Only checks localStorage flag
- If localStorage is cleared, even returning users will see welcome again

**Issue #3: Supabase metadata not read**
- `user_metadata.has_seen_onboarding` is written but never read
- Could be used as fallback if localStorage is missing

---

## 5. Potential Causes of Unexpected "Get Started" Appearance

Based on the current code, here are plausible reasons why "Get started" might appear unexpectedly:

### Reason #1: localStorage Cleared
- **Cause**: User cleared browser data, localStorage, or used "Clear Site Data"
- **Result**: `localStorage.getItem('heijo_hasSeenWelcome')` returns `null`
- **Fix**: Check Supabase `user_metadata.has_seen_onboarding` as fallback

### Reason #2: Different Browser/Device
- **Cause**: User logged in on a different browser or device
- **Result**: localStorage is browser-specific, so flag doesn't exist in new browser
- **Fix**: Check Supabase metadata first, then fall back to localStorage

### Reason #3: Incognito/Private Mode
- **Cause**: User in incognito mode (separate localStorage)
- **Result**: Flag doesn't exist in incognito session
- **Fix**: Check Supabase metadata (works across modes if authenticated)

### Reason #4: localStorage Write Failure
- **Cause**: Browser storage quota exceeded, or localStorage disabled
- **Result**: `localStorage.setItem()` fails silently, flag never set
- **Fix**: Add error handling, check if write succeeded

### Reason #5: Component Re-mounting
- **Cause**: React component unmounts and remounts (rare, but possible)
- **Result**: First `useEffect` runs again, checks localStorage
- **Fix**: Should be fine (flag persists), but could add guard

### Reason #6: Typo in localStorage Key
- **Cause**: Key name changed or typo in code
- **Result**: Reading wrong key or key doesn't exist
- **Current Key**: `'heijo_hasSeenWelcome'` (with underscore)
- **Fix**: Ensure consistency across codebase

### Reason #7: Race Condition
- **Cause**: Multiple components checking localStorage simultaneously
- **Result**: Unlikely but possible timing issue
- **Fix**: Should be fine (localStorage is synchronous)

---

## 6. Current Behavior Summary

### Intended Logic (Based on Code)

**For New Users:**
- ✅ Welcome overlay should appear on first visit
- ✅ Shows "Get started" button
- ✅ Can be dismissed by clicking button or typing
- ✅ Sets localStorage flag when dismissed
- ✅ Should never appear again after dismissal

**For Returning Users:**
- ✅ Welcome overlay should NOT appear
- ✅ Prompt system runs immediately
- ✅ Normal journaling experience

### Actual Behavior (Based on Code Analysis)

**The code SHOULD work correctly IF:**
- localStorage is available and writable
- User doesn't clear browser data
- User uses same browser/device

**The code MIGHT show welcome again IF:**
- localStorage is cleared
- User switches browsers/devices
- localStorage write fails silently
- User is in incognito mode (new session)

---

## 7. Code Flow Diagram

```
User Login
    ↓
Redirect to /journal
    ↓
JournalPage mounts
    ↓
Composer component mounts
    ↓
useEffect #1 runs (Lines 59-69)
    ↓
Check: localStorage.getItem('heijo_hasSeenWelcome')
    ↓
    ├─ NOT 'true' → setShowWelcomeOverlay(true) → Welcome appears
    │   ↓
    │   User sees "Get started" button
    │   ↓
    │   User clicks OR types
    │   ↓
    │   handleDismissWelcome() called
    │   ↓
    │   localStorage.setItem('heijo_hasSeenWelcome', 'true')
    │   ↓
    │   setShowWelcomeOverlay(false) → Welcome hidden
    │
    └─ IS 'true' → setHasSeenWelcome(true) → Welcome does NOT appear
        ↓
        Prompt logic runs immediately
```

---

## 8. Suggested Next Steps (Prose Only)

### Immediate Fixes

1. **Add Supabase Metadata Check as Fallback**
   - Currently, welcome overlay only checks localStorage
   - Should also check `user.user_metadata?.has_seen_onboarding`
   - Use Supabase value if localStorage is missing
   - This would fix cross-device/browser issues

2. **Add Error Handling for localStorage**
   - Wrap `localStorage.setItem()` in try-catch
   - Log errors if write fails
   - Consider alternative storage if localStorage unavailable

3. **Verify localStorage Key Consistency**
   - Ensure `'heijo_hasSeenWelcome'` is used consistently
   - Check for any old keys like `'heijo-has-seen-onboarding'` that might conflict

### Long-Term Improvements

1. **Unified Onboarding State**
   - Combine localStorage + Supabase metadata check
   - Check Supabase first (cross-device), then localStorage (fast fallback)
   - Sync both on dismissal

2. **User Account Age Check**
   - Check `user.created_at` to determine if truly new user
   - Only show welcome for users created in last 24-48 hours
   - Prevents showing welcome to old accounts that cleared localStorage

3. **Debug Logging**
   - Add console logs (dev mode only) showing:
     - localStorage value read
     - Supabase metadata value
     - Decision made (show/hide welcome)
   - Helps diagnose issues in production

4. **Testing Checklist**
   - Test: New user first login → should see welcome
   - Test: Returning user → should NOT see welcome
   - Test: Clear localStorage → should check Supabase
   - Test: Different browser → should check Supabase
   - Test: Incognito mode → should check Supabase

---

## 9. Key Findings

### What Works
- ✅ Welcome overlay appears correctly for first-time users
- ✅ Dismissal logic works (button click and typing)
- ✅ localStorage persistence works across sessions
- ✅ Prompt system correctly delays until welcome dismissed

### Potential Issues
- ⚠️ **No Supabase metadata check** - only localStorage is checked
- ⚠️ **No error handling** - localStorage write could fail silently
- ⚠️ **No user account age check** - doesn't verify if user is actually "new"
- ⚠️ **Cross-device issue** - welcome will show again on different browser/device

### Code Quality
- ✅ Clean separation of concerns (welcome logic in Composer)
- ✅ Proper React hooks usage
- ✅ Analytics tracking included
- ⚠️ Could benefit from error handling and fallback logic

---

**End of Diagnostic Report**

This report is read-only and does not include any code changes. All findings are based on static code analysis of the current codebase.

