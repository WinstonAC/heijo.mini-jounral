## Heijō QA Matrix — Implemented Feature Set

Scope: Covers features present in this repo (no calendar/OAuth/meditation/premium/enterprise).

### 1) Authentication (Supabase Magic Link / Session Persistence)
- Pre: Optional `.env.local` with Supabase keys; otherwise skip login.
- Steps:
  1. Navigate to `/login`. Enter email. Submit magic link.
  2. Open link; confirm redirect to `/journal` and session present.
  3. Refresh browser; confirm session persists.
- Expected: Session available; `localStorage['heijo_session']` set; logout clears session.

### 2) Journaling — Local-First Storage
- Steps:
  1. Create a text entry and save.
  2. Refresh page.
  3. If Supabase configured, confirm entry appears in `journal_entries` with `user_id`.
- Expected: Entry appears after refresh (from `localStorage`), `sync_status` updates to `synced` when online.

### 3) Voice Input — Web Speech API
- Steps:
  1. Grant mic permission.
  2. Start recording; speak a few sentences with pauses.
  3. Stop recording; save.
- Expected: Interim text streams; final transcript saved; latency within targets (<300ms first partial, <800ms final in normal hardware).

### 4) GDPR — Export and Deletion
- Steps:
  1. Go to `/privacy`.
  2. Export data (JSON and CSV) and download files.
  3. Trigger Delete All and confirm.
- Expected: Files contain entries and consent settings; after deletion, entries are gone and consent cleared.

### 5) Analytics (Local-Only, Consent-Gated)
- Steps:
  1. Ensure analytics consent is on in privacy settings.
  2. Create entries and perform searches.
  3. Open Analytics panel (when rendered in UI).
- Expected: `localStorage['heijo-analytics-data']` updates; dashboard shows sessions, totals, and percentages; clear resets metrics.

### 6) Offline Behavior
- Steps:
  1. Disable network.
  2. Create entries (text and voice if supported by browser offline).
  3. Reload app.
- Expected: Entries remain available from `localStorage`/IndexedDB; no crashes; sync occurs later when online.

### 7) Debug Diagnostics
- Steps:
  1. Ensure `NEXT_PUBLIC_DEBUG=1`.
  2. Visit `/debug/mic`.
- Expected: Probe runs client-side without build errors; results rendered as JSON.

Notes:
- Not in scope for this build: Google/Microsoft OAuth, calendar free/busy, scheduling/reminders, meditation audio modalities, premium gating, enterprise admin.

