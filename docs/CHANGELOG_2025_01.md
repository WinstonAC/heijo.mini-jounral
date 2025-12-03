# Changelog - January 2025

## Fixed Issues

### 🔴 Critical Fixes

#### 1. Local Storage Cross-Account Data Leakage
**Issue:** Entries from one account appeared when logged into another account.

**Fix:**
- Implemented strict filtering: Only entries with matching `user_id` are shown
- Added legacy key cleanup after migration
- Added localStorage cleanup on sign out
- Files modified: `lib/store.ts`, `lib/auth.tsx`

**Testing:** Sign in with different accounts and verify entries are isolated.

---

#### 2. Mobile Tooltip Positioning
**Issue:** Tooltips went off-screen on mobile devices.

**Fix:**
- Tooltips now hidden on mobile viewports (< 768px)
- Tooltips visible on desktop viewports (≥ 768px)
- Files modified: `components/Composer.tsx`, `components/MicButton.tsx`

**Testing:** Check tooltips on mobile - they should not appear or go off-screen.

---

### 🟡 Medium Priority Fixes

#### 3. Analytics Mismatch
**Issue:** "Features Used" showed zeros while "Entry Types" showed correct percentages.

**Fix:**
- Added `featuresUsed.textEntry++` increment on text entry save
- Synced `featuresUsed.voiceRecording` with completed recordings
- Files modified: `lib/analytics.ts`

**Testing:** Create text and voice entries, verify "Features Used" matches "Entry Types".

---

#### 4. Notification Settings Save Button
**Issue:** Save button visibility and feedback needed improvement.

**Fix:**
- Save button already exists and is visible
- Added "All settings are saved" message when no changes
- Enhanced confirmation feedback
- Files modified: `components/NotificationSettings.tsx`

**Testing:** Change notification settings and verify save works with confirmation.

---

### 🟢 Low Priority Fixes

#### 5. App Icon Color
**Issue:** App icon appeared with blue color on iPhone home screen.

**Fix:**
- Updated `theme_color` from `#3AA6FF` (blue) to `#1A1A1A` (graphite-charcoal)
- Updated `background_color` to `#F8F8FA` (mist-white)
- Changed icon `purpose` from `maskable` to `any` for exact color display
- Added Apple-specific meta tags via Next.js metadata API
- Files modified: `public/site.webmanifest`, `app/layout.tsx`

**Testing:** Add app to iPhone home screen and verify icon color matches brand.

---

## Documentation Updates

- ✅ Updated `docs/QA_MATRIX.md` with new test cases for all fixes
- ✅ Removed `docs/WHAT_TO_TEST.md` (redundant with QA Matrix)
- ✅ Updated `docs/DIAGNOSTIC_REPORT_2025.md` with fix status

---

### 🟢 Low Priority Fixes (continued)

#### 6. Mobile Navigation - Sign Out Button
**Issue:** Sign out button was only available on desktop, missing from mobile navigation.

**Fix:**
- Added Sign Out button to mobile bottom navigation pill
- Button matches existing mobile navigation styling and sizing
- Maintains consistent touch target size (44px minimum)
- Files modified: `app/journal/page.tsx`

**Testing:** On mobile viewport, verify Sign Out button appears in bottom navigation alongside Settings.

---

#### 7. Voice Language Selection
**Issue:** Voice recognition was limited to browser default language.

**Fix:**
- Added LanguageSelector component for voice input language configuration
- Integrated with voice settings context for persistence
- Available in Settings → Display → Voice Input Language
- Supports multiple languages for Web Speech API
- Files modified: `components/LanguageSelector.tsx`, `lib/voiceSettings.tsx`, `lib/voiceToText.ts`, `components/Settings.tsx`, `components/MicButton.tsx`

**Testing:** Change voice language in Settings and verify voice recognition uses selected language.

---

#### 8. Build Configuration
**Issue:** Test files were being included in Next.js production build, causing type errors.

**Fix:**
- Excluded `tests` directory and `vitest.config.ts` from TypeScript compilation
- Added `@ts-nocheck` to vitest config to prevent build type checking
- Files modified: `tsconfig.json`, `vitest.config.ts`

**Testing:** Verify production build completes successfully without test file errors.

---

## Deployment Notes

All changes are ready for deployment. After deployment:

1. Test cross-account isolation with multiple accounts
2. Test mobile tooltip behavior on real devices
3. Verify analytics counters match entry counts
4. Test notification settings save functionality
5. Verify app icon color on iOS home screen
6. Test mobile sign out functionality
7. Test voice language selection in Settings

---

## Files Changed

### Core Logic
- `lib/store.ts` - Strict user filtering and legacy cleanup
- `lib/auth.tsx` - Sign out cleanup
- `lib/analytics.ts` - Counter fixes
- `lib/voiceSettings.tsx` - Voice language settings context (new)
- `lib/voiceToText.ts` - Language selection integration

### Components
- `components/Composer.tsx` - Mobile tooltip fix
- `components/MicButton.tsx` - Mobile tooltip fix, language support
- `components/NotificationSettings.tsx` - Save button enhancement
- `components/LanguageSelector.tsx` - Voice language selector (new)
- `components/Settings.tsx` - Voice language settings integration

### Pages
- `app/journal/page.tsx` - Mobile sign out button addition
- `app/layout.tsx` - VoiceSettingsProvider integration

### Configuration
- `public/site.webmanifest` - Theme color and icon updates
- `app/layout.tsx` - Apple meta tags and viewport theme color
- `tsconfig.json` - Test directory exclusions
- `vitest.config.ts` - Build exclusion configuration

### Documentation
- `docs/QA_MATRIX.md` - Updated with new test cases
- `docs/DIAGNOSTIC_REPORT_2025.md` - Marked fixes as complete
- `docs/CHANGELOG_2025_01.md` - This file

---

**Deployment Status:** ✅ Ready for Production  
**Test Status:** ⏳ Pending User Testing

