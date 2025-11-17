# Implementation Plan - Fixes

## 1. Local Storage Cross-Account Data Leakage Fix

### Problem
Entries from one account appear when logged into another account.

### Solution (IMPLEMENTED)
1. **Strict Filtering**: ✅ Only show entries where `entry.user_id === userId` (remove `!entry.user_id` fallback for logged-in users)
2. **Clean Legacy Key**: ✅ Delete legacy `heijo-journal-entries` key after successful migration
3. **Preserve on Logout**: ✅ Entries remain in localStorage (scoped keys prevent leakage, entries rehydrate on next login)
4. **Migration Safety**: ✅ Only migrate entries with valid matching `user_id`
5. **Guest Entry Support**: ✅ Treat both `undefined` and `'anonymous'` as guest entries

### Files to Modify
- `lib/store.ts` - Fix `getStoredEntries()` filtering logic
- `lib/auth.tsx` - Add localStorage cleanup on signOut

### Changes (IMPLEMENTED)
- ✅ Filter updated: Strict matching for logged-in users, guest entry support for anonymous users
- ✅ Legacy key cleanup: Deleted after successful migration
- ✅ Logout behavior: Entries preserved (scoped keys provide isolation)
- ✅ Enhanced user ID fallback: Multi-level fallback chain for reliability

---

## 2. Mobile Tooltip Positioning Fix

### Problem
Tooltips go off-screen on mobile devices.

### Solution
1. **Hide tooltips on mobile**: Use `hidden sm:block` to hide tooltips on small screens
2. **Alternative**: Position tooltips above on mobile, below on desktop
3. **Use title attribute**: Fallback to native tooltips on mobile

### Files to Modify
- `components/Composer.tsx` - Fix tooltip positioning for Save and History buttons
- `components/MicButton.tsx` - Fix tooltip positioning

### Changes
- Add `hidden sm:block` to tooltip divs on mobile
- Or change positioning to `top-full` on mobile, `bottom-full` on desktop

---

## 3. Analytics Mismatch Fix

### Problem
"Features Used" shows zeros while "Entry Types" shows correct percentages.

### Solution
1. **Increment `textEntry` counter**: Add `featuresUsed.textEntry++` in `text_entry_save` event handler
2. **Sync voice counters**: Ensure `featuresUsed.voiceRecording` increments on complete, not just start

### Files to Modify
- `lib/analytics.ts` - Add missing counter increments

### Changes
- Line 197: Add `this.analyticsData.featuresUsed.textEntry++` in `text_entry_save` case
- Verify `voice_recording_complete` also increments `featuresUsed.voiceRecording` if needed

---

## 4. Notification Settings Save Button

### Problem
No visible save button in NotificationSettings component.

### Solution
1. **Add save button**: Place it at the bottom of the notification settings section
2. **Keep same UX**: Match existing button styles from Settings component
3. **Show feedback**: Display "Saved" confirmation when successful

### Files to Modify
- `components/NotificationSettings.tsx` - Add save button UI

### Changes
- Add save button after reminder settings section
- Use same styling as other buttons in Settings
- Show confirmation message when saved

---

## 5. App Icon Color Fix

### Problem
App icon appears with weird blue color on iPhone home screen.

### Solution
1. **Update theme_color**: Change from `#3AA6FF` (blue) to `#1A1A1A` (graphite-charcoal)
2. **Update background_color**: Ensure it matches app background
3. **Create better icon**: Optionally create a colored PNG icon instead of black/white SVG
4. **Add Apple meta tags**: Add iOS-specific meta tags in layout

### Files to Modify
- `public/site.webmanifest` - Update theme_color
- `app/layout.tsx` - Add Apple-specific meta tags
- `public/icon-192.svg` - Optionally update icon design

### Changes
- Change `theme_color` to `#1A1A1A`
- Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- Add `<meta name="apple-mobile-web-app-capable" content="yes">`

---

## Implementation Order
1. Local Storage Fix (Critical - Privacy)
2. Analytics Fix (Medium - Data accuracy)
3. Mobile Tooltip Fix (Medium - UX)
4. Notification Save Button (Medium - Feature completion)
5. App Icon Fix (Low - Cosmetic)

