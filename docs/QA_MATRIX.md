## Heijō QA Matrix — Implemented Feature Set

**Last Updated:** January 17, 2025  
**Scope:** Covers features present in this repo (no calendar/OAuth/meditation/premium/enterprise).

### Test Status
- **Automated E2E Tests**: Partial (1/8 passing - routing test in Chromium)
- **Manual Testing**: All features verified working with proper Supabase configuration
- **Test Prerequisites**: Supabase environment variables required for full test suite

---

### 1) Authentication (Supabase Magic Link / Session Persistence)
**Pre:** Optional `.env.local` with Supabase keys; otherwise skip login.

**Steps:**
1. Navigate to `/login`. Enter email. Submit magic link.
2. Open link; confirm redirect to `/journal` and session present.
3. Refresh browser; confirm session persists.
4. Sign out; verify localStorage is cleared.

**Expected:**
- Session available; `localStorage['heijo_session']` set
- Logout clears session and user-specific localStorage keys
- No cross-account data leakage

---

### 2) Journaling — Local-First Storage & Cross-Account Isolation
**Steps:**
1. Sign in with Account A (e.g., user1@example.com)
2. Create 2-3 text entries and save.
3. Sign out completely.
4. Sign in with Account B (e.g., user2@example.com)
5. Verify Account B's history is empty (no entries from Account A).
6. Create entries with Account B.
7. Sign out and sign back in as Account A.
8. Verify Account A only sees their own entries.

**Expected:**
- Entries appear after refresh (from `localStorage`)
- Each account only sees their own entries
- No cross-account data leakage
- If Supabase configured, entries appear in `journal_entries` with correct `user_id`
- `sync_status` updates to `synced` when online

---

### 2b) Regression — Entries Persist After Logout & Remain Isolated Per Account
**Steps:**
1. Sign in with Account A and create a new entry.
2. Sign out, refresh the page, and sign back into Account A.
3. Confirm the entry renders immediately from `localStorage` (before any network calls).
4. Sign out again, then sign in with Account B.
5. Confirm Account B sees an empty journal history (or only their own entries).
6. Inspect `localStorage` and note that Account A stored data in `heijo-journal-entries:<accountA-id>` while Account B stores data under `heijo-journal-entries:<accountB-id>`.

**Expected:**
- Account A's entry persists across sign-out/sign-in cycles because the scoped key is retained.
- Account B does not see Account A's entries because the key names differ per `userId`.
- Deleting journal data on logout is unnecessary; key scoping already prevents cross-account leakage.

---

### 3) Voice Input — Web Speech API
**Steps:**
1. Grant mic permission.
2. Start recording; speak a few sentences with pauses.
3. Stop recording; save.
4. Verify entry is saved with `source: 'voice'`.

**Expected:**
- Interim text streams appear
- Final transcript saved
- Latency within targets (<300ms first partial, <800ms final in normal hardware)
- Entry marked as voice entry in history

---

### 3b) Voice Language Selection
**Steps:**
1. Go to Settings → Display → Voice Input Language.
2. Select a different language (e.g., Spanish, French).
3. Close Settings and start a voice recording.
4. Speak in the selected language.
5. Verify transcription uses the selected language.
6. Reopen Settings and verify language selection persisted.

**Expected:**
- Language selector available in Settings
- Selected language persists across sessions
- Voice recognition uses selected language
- Language setting stored in localStorage

---

### 4) Mobile UI — Tooltip Behavior
**Steps:**
1. Open app on mobile device (or mobile viewport < 768px)
2. Navigate to journal page.
3. Hover/tap on Save button (S) and History button (H).
4. Verify tooltips do NOT appear (or don't go off-screen).
5. Switch to desktop viewport (> 768px).
6. Hover over buttons.
7. Verify tooltips appear correctly above buttons.

**Expected:**
- Tooltips hidden on mobile (< 768px)
- Tooltips visible on desktop (≥ 768px)
- No tooltips going off-screen on any device

---

### 4b) Mobile Navigation — Sign Out Button
**Steps:**
1. Open app on mobile device (or mobile viewport < 768px)
2. Navigate to journal page.
3. Scroll to bottom navigation pill.
4. Verify Sign Out button appears alongside Settings button.
5. Tap Sign Out button.
6. Verify user is signed out and redirected to login page.

**Expected:**
- Sign Out button visible in mobile bottom navigation
- Button matches existing navigation styling (44px minimum touch target)
- Sign out functionality works correctly
- Session cleared after sign out

---

### 5) Analytics Accuracy — Features Used vs Entry Types
**Steps:**
1. Ensure analytics consent is enabled in Settings.
2. Create 3 text entries (save each).
3. Create 2 voice entries (record and save).
4. Go to Settings → Analytics Dashboard.
5. Check "Entry Types" section (Voice % vs Text %).
6. Check "Features Used" section (Voice Recording count vs Text Entry count).

**Expected:**
- Entry Types shows correct percentages (e.g., Voice 40%, Text 60%)
- Features Used shows matching counts:
  - Voice Recording: 2 (matches number of voice entries)
  - Text Entry: 3 (matches number of text entries)
- Counters increment correctly on each save
- No zeros when entries exist

---

### 6) Notification Settings — Save Functionality
**Steps:**
1. Go to Settings → Reminders & Notifications.
2. Toggle "Enable Reminders" ON.
3. Set reminder time (e.g., 8:00 PM).
4. Select frequency (Daily or Weekly).
5. Click "Save Reminder Settings" button.
6. Verify "✓ Reminder settings saved" confirmation appears.
7. Close and reopen Settings.
8. Verify settings persisted (reminder still enabled, time still set).

**Expected:**
- Save button is visible and enabled when changes are made
- Settings save successfully to localStorage
- Confirmation message appears after save
- Settings persist across page refreshes
- "All settings are saved" message shows when no changes

---

### 7) App Icon & PWA — Home Screen Installation
**Steps:**
1. Open app in mobile browser (iOS Safari or Android Chrome).
2. Use "Add to Home Screen" feature.
3. Verify app icon appears on home screen.
4. Check icon color matches brand (graphite-charcoal #1A1A1A, not blue).
5. Tap icon to launch app.
6. Verify app opens in standalone mode (no browser UI).

**Expected:**
- Icon appears with correct color (dark gray/black, not blue)
- Icon matches brand aesthetic
- App launches in standalone PWA mode
- Status bar style is black-translucent (iOS)

---

### 8) GDPR — Export and Deletion
**Steps:**
1. Go to `/privacy` or Settings.
2. Export data (JSON and CSV) and download files.
3. Open files; verify they contain entries and consent settings.
4. Trigger Delete All and confirm.
5. Refresh page; verify entries are gone.

**Expected:**
- Files contain entries and consent settings
- After deletion, entries are gone and consent cleared
- localStorage is cleared appropriately

---

### 9) Offline Behavior
**Steps:**
1. Disable network (airplane mode or dev tools).
2. Create entries (text and voice if supported by browser offline).
3. Reload app.
4. Verify entries remain available.
5. Re-enable network.
6. Verify sync occurs when online.

**Expected:**
- Entries remain available from `localStorage`/IndexedDB
- No crashes when offline
- Sync occurs later when online
- `sync_status` updates appropriately

---

### 10) Debug Diagnostics
**Steps:**
1. Ensure `NEXT_PUBLIC_DEBUG=1` (if needed).
2. Visit `/debug/mic`.
3. Run probe.

**Expected:**
- Probe runs client-side without build errors
- Results rendered as JSON
- No console errors

---

## Notes

**Not in scope for this build:**
- Google/Microsoft OAuth
- Calendar free/busy
- Scheduling/reminders (UI exists, but background scheduler not implemented)
- Meditation audio modalities
- Premium gating
- Enterprise admin

**Recent Fixes (January 2025):**
- ✅ Fixed local storage cross-account data leakage
- ✅ Fixed mobile tooltip positioning
- ✅ Fixed analytics mismatch (Features Used vs Entry Types)
- ✅ Enhanced notification settings save button visibility
- ✅ Fixed app icon color (theme_color updated to match brand)
- ✅ Added Sign Out button to mobile navigation
- ✅ Added voice language selection feature
- ✅ Fixed build configuration (excluded test files from production build)

