## Heijō Mini‑Journal — Test Accounts

Use these accounts for smoke tests and demos. Replace placeholders with real values once created.

### Primary test account (recommended)
- Email: testrunner+01@heijo.io
- Temporary password: Heijo-Test-2025!
- Notes: Standard user for end‑to‑end journaling and privacy flows.

### Alternate account(s)
- Email: testrunner+02@heijo.io
- Temporary password: Heijo-Test-2025!

### How to create these accounts
Option A — Supabase Dashboard (recommended for test accounts):
1. Open your Supabase project → Authentication → Users
2. Click "Add user" → enter email and set a temporary password
3. **IMPORTANT**: After creating, click the user → "Confirm email" button to verify the account
   - Without confirmation, login will fail with "Email not confirmed" error
   - Test accounts must have `email_confirmed_at` set for automated tests to work

Option B — Via app:
1. Visit the deployed site: https://journal.heijo.io/login
2. Click "Sign up" and create the account(s) above
3. Check email and confirm the account link
4. Record the password(s) here after creation

### Data reset
- Use `/privacy` → “Delete all data” to clear test entries for the currently signed‑in user
- Optionally, clear browser site data if you want a completely clean slate

### Security note
- Do not reuse production passwords; use unique test‑only passwords
- Limit distribution of test passwords to trusted testers only
- Rotate temporary passwords after the beta starts


