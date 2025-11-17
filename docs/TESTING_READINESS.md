## 🧘‍♂️ Heijō — Testing Readiness & Feature Validation Report

**Last Updated**: 2025-11-17  
**Scope:** Current Heijō Mini‑Journal web app codebase feature validation and QA readiness.

---

## ✅ Feature Completeness & Behavior

### Authentication
- **How it works**: Supabase Auth using magic link and email/password as fallback (`lib/auth.tsx`, `lib/supabaseClient.ts`, `app/login/page.tsx`). Session persisted to `localStorage` under `heijo_session`.
- **Password reset**: Full password reset flow implemented with dedicated `/reset-password` page (`app/reset-password/page.tsx`)
- **Re-auth after restart**: Yes, via Supabase session + `localStorage` backup
- **Logout behavior**: Journal entries are preserved on logout (user-scoped keys prevent cross-account leakage, entries rehydrate on next login)
- **Readiness**: ✅ Works

### Journaling — Local-First Storage
- **How it works**: Hybrid storage with local-first save and optional Supabase sync (`lib/store.ts`). Entries stored in user-scoped `localStorage` keys `heijo-journal-entries:${userId}`; sync to Supabase when premium configured.
- **Persistence**: Yes, via `localStorage` and IndexedDB; cloud sync optional via Supabase. Entries persist across logout/login cycles.
- **Guest entries**: Supports both `undefined` and `'anonymous'` user_id values for guest users
- **User ID fallback**: Multi-level fallback chain (Supabase → session storage → last-known user ID) for reliability
- **Privacy/deletion**: `gdprManager.deleteAllData()` clears secure data and consent keys; export CSV/JSON supported
- **Readiness**: ✅ Works

### Voice Input — Web Speech API
- **How it works**: Browser-native voice recognition (`lib/voiceToText.ts`). Real-time transcription streaming with <300ms latency.
- **Offline support**: Works without internet connection
- **Readiness**: ✅ Works

### Premium Tier Logic
- **How it works**: Premium status stored in `user_metadata.premium` (boolean). Cloud sync gated behind premium check in `lib/store.ts`. Premium toggle in Settings (`components/Settings.tsx`). Manual activation for testing (free).
- **Code location**: `lib/premium.ts` (utilities), `lib/store.ts` (storage gating), `components/Settings.tsx` (UI)
- **Readiness**: ✅ Implemented (testing phase)
- **Documentation**: See `docs/PREMIUM_FEATURES.md`

### Analytics / Usage Tracking
- **How it works**: Local‑only analytics collected with consent (`lib/analytics.ts`). Events tracked to `localStorage` under `heijo-analytics-data` and `heijo-analytics-events`. Dashboard UI reads data in `components/AnalyticsDashboard.tsx`.
- **Sync to backend**: No; local only
- **Readiness**: ✅ Works (local‑only)

### Search & Filter
- **How it works**: Search and tag filtering in History drawer (`components/RecentEntriesDrawer.tsx`). Filters entries by content and tags.
- **Readiness**: ✅ Works

### Export Functionality
- **How it works**: CSV export (`lib/csvExport.ts`). Format: Date, Time, Content, Tags (comma-separated), Source. Filename: `heijo-journal-YYYY-MM-DD.csv`.
- **Readiness**: ✅ Works

---

## 🧪 QA Test Scenarios

### 1) Authentication (Supabase Magic Link / Session Persistence)
**Pre**: Optional `.env.local` with Supabase keys; otherwise skip login.

**Steps**:
1. Navigate to `/login`. Enter email. Submit magic link.
2. Open link; confirm redirect to `/journal` and session present.
3. Refresh browser; confirm session persists.
4. Test password reset flow:
   - Click "Forgot password?" on login page
   - Enter email and submit
   - Check email for reset link
   - Click link; should redirect to `/reset-password`
   - Enter new password and confirm
   - Should redirect to `/login` after success
5. Test logout behavior:
   - Create an entry while logged in
   - Sign out
   - Sign back in with same account
   - Verify entry is still present (rehydrated from localStorage)

**Expected**: Session available; `localStorage['heijo_session']` set; logout clears session but preserves journal entries; password reset flow works end-to-end.

### 2) Journaling — Local-First Storage
**Steps**:
1. Create a text entry and save.
2. Refresh page.
3. If Supabase configured and premium active, confirm entry appears in `journal_entries` with `user_id`.

**Expected**: Entry appears after refresh (from `localStorage`), `sync_status` updates to `synced` when online (if premium).

### 3) Voice Input — Web Speech API
**Steps**:
1. Grant mic permission.
2. Start recording; speak a few sentences with pauses.
3. Stop recording; save.

**Expected**: Interim text streams; final transcript saved; latency within targets (<300ms first partial, <800ms final).

### 4) GDPR — Export and Deletion
**Steps**:
1. Go to Settings → Export Your Data.
2. Export data (CSV) and download file.
3. Trigger Delete All and confirm.

**Expected**: CSV file contains entries with Date, Time, Content, Tags, Source; after deletion, entries are gone and consent cleared.

### 5) Search & Filter
**Steps**:
1. Create entries with different tags (Gratitude, Reflection, Energy).
2. Click History button (H).
3. Search for entries by content.
4. Filter by tags.

**Expected**: Search finds entries by content; tag filters show only matching entries; both work together.

### 6) Premium Features
**Steps**:
1. Go to Settings → Consent Settings.
2. Toggle Premium Cloud Sync ON.
3. Activate Premium (free for testing).
4. Create entry → Should sync to Supabase.
5. Toggle Premium OFF → Warning appears.

**Expected**: Premium activation works; entries sync to cloud; deactivation shows warning.

### 7) Offline Behavior
**Steps**:
1. Disable network.
2. Create entries (text and voice if supported by browser offline).
3. Reload app.

**Expected**: Entries remain available from `localStorage`/IndexedDB; no crashes; sync occurs later when online (if premium).

---

## 📝 Testing Checklist

### Browser Support
- Chrome (latest)
- Safari 16+
- Firefox (latest)
- Edge (latest)

### What To Test
1. **Auth**
   - Sign up with email/password
   - Sign in/out
   - Password reset
   - Optional: Magic link sign in

2. **Journaling**
   - Create, edit, and delete entries
   - Add/remove tags; filter/search entries
   - Voice entry (if browser supports Web Speech API)

3. **Persistence**
   - Refresh the page; entries remain
   - Close and reopen the browser; entries remain

4. **Privacy**
   - Visit Settings → Export CSV; file downloads and is valid
   - Delete all data; verify entries are gone after refresh

5. **Premium**
   - Activate premium (free for testing)
   - Verify entries sync to cloud
   - Deactivate premium; verify warning

6. **Offline** (optional)
   - Disable network; create and view entries (sync not required)

### Bugs to Log
- Auth failures, data not saving/loading, search/tag issues, export file invalid, delete not clearing, UI blocking issues, premium sync failures.

### Report Issues
- **GitHub Issues**: https://github.com/WinstonAC/heijo.mini-jounral/issues
- **Email**: support@heijo.io
- Include: browser + OS, steps, expected vs actual, screenshots if possible

---

## 📦 Local Storage Keys Reference

- `heijo_session`: Supabase session JSON for resilience
- `heijo-journal-entries:${userId}`: User-scoped array of entries with `sync_status` and optional `last_synced` (replaces legacy `heijo-journal-entries`)
- `heijo_last_user_id`: Last known user ID for fallback when Supabase is unavailable
- `HeijoSecureStorage`: Encrypted entries/metadata via `secureStorage` (IndexedDB)
- `heijo-consent-settings`: Consent flags for microphone, storage, analytics
- `heijo-analytics-data` / `heijo-analytics-events`: Usage metrics and events

---

## 🚀 Next Steps Before QA Launch

- **Environment & RLS**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set; verify RLS policies per `docs/technical/DATABASE.md`
- **Capacity**: Confirm Supabase project and hosting plan can handle expected users
- **Documentation**: Share `docs/TESTER_ONBOARDING.md` with testers
- **Feedback**: Direct testers to GitHub Issues for bug reports

---

**Related Documentation**:
- Premium Features: `docs/PREMIUM_FEATURES.md`
- Architecture: `docs/technical/ARCHITECTURE.md`
- Tester Onboarding: `docs/TESTER_ONBOARDING.md`
