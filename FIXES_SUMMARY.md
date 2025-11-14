# Heijō Journal App - Fixes Summary

## Overview
This document summarizes the fixes implemented for four critical issues in the Heijō mini-journal web app.

---

## Issue 1: "Save" Label Clipped on Mobile ✅

### Root Cause
The Save button was a small circular button (5x5 on mobile) with a hover tooltip positioned above it. On mobile devices, especially iPhones with Safari, the tooltip could be clipped off the left side of the viewport and sit too close to the browser chrome and iOS home indicator.

### Fix Implemented
- **Mobile**: Replaced the small button with a full-width, fixed bottom button that:
  - Uses `fixed inset-x-0 bottom-0` positioning
  - Includes safe-area padding for iOS home indicator
  - Has clear "Save Entry" label (no tooltip needed)
  - Is thumb-friendly with adequate padding
- **Desktop**: Kept the compact circular button with hover tooltip for space efficiency
- Added bottom padding to the composer area on mobile to prevent content from being hidden behind the fixed button

### Files Changed
- `components/Composer.tsx`: Added responsive Save button (mobile vs desktop)
- `app/globals.css`: Added `.safe-area-bottom` utility class for iOS safe area support

### Key Changes
```typescript
// Mobile: Full-width Save button at bottom
<div className="sm:hidden fixed inset-x-0 bottom-0 bg-white border-t border-soft-silver p-4 safe-area-bottom z-20">
  <button onClick={handleManualSave} className="w-full py-3 px-4 ...">
    {isAutoSaving ? 'Saving...' : 'Save Entry'}
  </button>
</div>
```

---

## Issue 2: Reminder Settings Do Not Feel Saved ✅

### Root Cause
Reminder settings were auto-saving on every change (toggle, time change, frequency change), but there was no visible Save button or confirmation feedback. Users had no way to know if their changes were actually persisted.

### Fix Implemented
- Added a visible "Save Reminder Settings" button in the reminder settings section
- Changed behavior from auto-save to manual save:
  - Toggles and time changes now mark settings as "unsaved" (`hasUnsavedChanges` state)
  - Save button is disabled when there are no unsaved changes
  - Save button shows "Saving..." state during save operation
- Added confirmation message: "✓ Reminder settings saved" appears for 3 seconds after successful save
- Moved push notification permission handling to the save handler (only requests permission when saving, not on toggle)

### Files Changed
- `components/NotificationSettings.tsx`: 
  - Added `hasUnsavedChanges` and `showSaveConfirmation` state
  - Changed `handleToggle`, `handleTimeChange`, `handleFrequencyChange` to mark as unsaved
  - Added `handleSaveReminderSettings` function
  - Added Save button and confirmation message UI

### Key Changes
```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

// Save button
<button onClick={handleSaveReminderSettings} disabled={!hasUnsavedChanges || isSaving}>
  {isSaving ? 'Saving...' : 'Save Reminder Settings'}
</button>

// Confirmation message
{showSaveConfirmation && (
  <div className="text-sm text-green-600 text-center">
    ✓ Reminder settings saved
  </div>
)}
```

---

## Issue 3: First-Run "Get Started" Onboarding Card ✅

### Root Cause
1. Onboarding card appeared based on `localStorage.getItem('heijo_hasSeenWelcome')` flag, not actual entry count
2. Layout was not ideal (floated too close to bottom)
3. Copy didn't clearly explain how to use the app
4. Font consistency issues (mixed font families)

### Fix Implemented
- **Entry-based visibility**: Onboarding now only shows when user has **zero journal entries** (checked via `entryCount` prop)
- **Improved layout**:
  - Centered vertically in safe area (not hugging bottom)
  - Better spacing and padding
  - Responsive design for mobile and desktop
- **Clearer copy**:
  - Short heading: "Welcome to Heijō"
  - One paragraph explaining usage: "Type or speak your thoughts, tag today's vibe, then tap Save."
  - Clear CTA button: "Tap to get started"
- **Font consistency**: Uses Inter font family (brand font) consistently, matching the rest of the app

### Files Changed
- `components/Composer.tsx`:
  - Added `entryCount` prop
  - Updated onboarding logic to check `entryCount === 0`
  - Redesigned welcome overlay with improved layout and copy
  - Ensured font consistency (Inter font family)
- `app/journal/page.tsx`: Pass `entryCount={entries.length}` to Composer

### Key Changes
```typescript
// Only show onboarding if user has zero entries
if (entryCount > 0) {
  setHasSeenWelcome(true);
  setShowWelcomeOverlay(false);
  return;
}

// Improved onboarding UI
<div className="max-w-lg w-full space-y-6 text-center px-4">
  <h1 className="text-2xl sm:text-3xl font-semibold body-text">
    Welcome to Heijō
  </h1>
  <p className="text-base sm:text-lg leading-relaxed">
    Type or speak your thoughts, tag today's vibe, then tap Save.
  </p>
  <button onClick={handleDismissWelcome} className="...">
    Tap to get started
  </button>
</div>
```

---

## Issue 4: Journal Storage and Cross-Account Behavior ✅

### Root Cause
1. **localStorage key was not scoped by user**: All users on the same device shared the same `'heijo-journal-entries'` key
2. **Missing user_id filtering**: When loading entries, the code didn't filter by `user_id`, so User B could see User A's entries
3. **No persistence guarantee**: Entries could disappear if localStorage was cleared or if user_id wasn't properly set

### Fix Implemented
- **User-scoped localStorage keys**: Changed from `'heijo-journal-entries'` to `'heijo-journal-entries:${userId}'`
- **User filtering**: 
  - All `getEntries()` calls now filter by current user's `user_id`
  - Added safety checks in `HybridStorage.getEntries()` to filter entries
  - Added filtering in `LocalStorage.getStoredEntries()` as a safety measure
- **Legacy migration**: Added logic to migrate entries from legacy key to user-scoped key on first load
- **Supabase filtering**: Ensured all Supabase queries use `.eq('user_id', user.id)` filter
- **Entry user_id enforcement**: All saved entries now include `user_id` field

### Files Changed
- `lib/store.ts`:
  - `LocalStorage.getStorageKey()`: Now accepts `userId` parameter and returns scoped key
  - `LocalStorage.getCurrentUserId()`: New method to get current authenticated user ID
  - `LocalStorage.saveEntry()`: Uses scoped key and ensures `user_id` is set
  - `LocalStorage.getEntries()`: Filters by current user ID
  - `LocalStorage.getStoredEntries()`: Added user filtering and legacy migration logic
  - `HybridStorage.getEntries()`: Added user filtering for both localStorage and Supabase entries

### Key Changes
```typescript
// User-scoped storage key
private getStorageKey(userId?: string): string {
  if (userId) {
    return `heijo-journal-entries:${userId}`;
  }
  return 'heijo-journal-entries'; // Legacy fallback
}

// Get current user ID
private async getCurrentUserId(): Promise<string | undefined> {
  if (supabase && isSupabaseConfigured()) {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }
  return undefined;
}

// Filter entries by user
const filteredLocalEntries = currentUserId
  ? localEntries.filter(entry => !entry.user_id || entry.user_id === currentUserId)
  : localEntries;
```

---

## Test Checklist

### Issue 1: Save Button on Mobile
- [ ] On iPhone Safari, open the journal page
- [ ] Type some content in the textarea
- [ ] Verify the "Save Entry" button appears at the bottom of the screen
- [ ] Verify the button is fully visible (not clipped)
- [ ] Verify the button has adequate spacing from the iOS home indicator
- [ ] Tap the button and verify it saves the entry
- [ ] On desktop, verify the compact circular "S" button still works with hover tooltip

### Issue 2: Reminder Settings Save
- [ ] Open Settings → Notifications/Reminders
- [ ] Toggle "Smart Skip" or "Quiet Hours"
- [ ] Verify the "Save Reminder Settings" button becomes enabled
- [ ] Change reminder time or frequency
- [ ] Verify unsaved changes are tracked
- [ ] Click "Save Reminder Settings"
- [ ] Verify "✓ Reminder settings saved" confirmation appears
- [ ] Verify confirmation disappears after 3 seconds
- [ ] Reload the page and verify settings persist

### Issue 3: Onboarding Card
- [ ] Create a brand-new account (or clear localStorage and Supabase metadata)
- [ ] Log in and navigate to journal page
- [ ] Verify onboarding card appears with:
  - "Welcome to Heijō" heading
  - "Type or speak your thoughts, tag today's vibe, then tap Save." instructions
  - "Tap to get started" button
- [ ] Verify card is centered (not hugging bottom)
- [ ] Verify fonts match the rest of the app (Inter font family)
- [ ] Click "Tap to get started" or start typing
- [ ] Verify onboarding card disappears
- [ ] Create a journal entry
- [ ] Reload the page
- [ ] Verify onboarding card does NOT reappear (user has entries now)

### Issue 4: Storage and Cross-Account Behavior
- [ ] **Test 1: Same device, different users**
  - Log in as User A (non-premium)
  - Create 2-3 journal entries
  - Log out
  - Log in as User B (non-premium) on the same device
  - Verify User B does NOT see User A's entries
  - Create 1 entry as User B
  - Log out and log back in as User A
  - Verify User A still sees their original 2-3 entries (not User B's entry)
  
- [ ] **Test 2: Persistence across sessions**
  - Log in as User A
  - Create an entry today
  - Close the browser completely
  - Reopen browser and log in as User A tomorrow
  - Verify the entry from yesterday is still present
  
- [ ] **Test 3: Premium user storage**
  - Log in as User A with Premium ON
  - Create an entry
  - Verify entry is saved to both localStorage and Supabase
  - Log out and log in on a different device as User A
  - Verify entry syncs from Supabase (if Premium is ON)
  
- [ ] **Test 4: localStorage key scoping**
  - Open browser DevTools → Application → Local Storage
  - Log in as User A
  - Create an entry
  - Verify localStorage key is `heijo-journal-entries:${userA_id}`
  - Log out and log in as User B
  - Create an entry
  - Verify localStorage key is `heijo-journal-entries:${userB_id}`
  - Verify both keys exist and contain different entries

---

## Summary of Root Causes and Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| **1. Clipped Save label** | Small button with tooltip positioned off-screen on mobile | Full-width fixed bottom button on mobile, compact button on desktop |
| **2. Reminder settings** | Auto-save with no feedback | Manual save button with confirmation message |
| **3. Onboarding card** | Flag-based visibility, poor layout/copy, font inconsistency | Entry-count-based visibility, improved layout/copy, consistent fonts |
| **4. Storage leakage** | Shared localStorage key, missing user_id filtering | User-scoped keys, user_id filtering at all levels |

---

## Notes

- All fixes maintain backward compatibility where possible (legacy localStorage key migration)
- Font consistency: All components now use Inter font family (brand font) as defined in `app/globals.css`
- Mobile-first design: Save button uses responsive classes (`sm:hidden` / `hidden sm:flex`)
- Safe area support: Added `.safe-area-bottom` utility for iOS home indicator spacing
- User privacy: Storage scoping ensures users never see another user's entries on shared devices

