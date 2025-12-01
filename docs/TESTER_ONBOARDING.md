## Heijō Mini‑Journal — Tester Onboarding (Beta)

### Goal
Validate core journaling, auth, privacy export/delete, and basic UX across common browsers.

### Access
- Web URL: set by maintainer (Vercel/host). Share this with testers.
- Optional: Shared test account(s) listed in `docs/TEST_ACCOUNTS.md`

### Sign in
1. Open the site URL: `https://journal.heijo.io`
2. Create an account (email/password or magic link)
3. **Check your email** and click the confirmation link to verify your account
4. Return to the app and sign in

### Core flow to try (5 minutes)
1. Create 2–3 journal entries (text and voice if supported in your browser)
2. Add tags, view entries list, search for a keyword
3. Export your data (JSON or CSV)
4. Delete your data from `/privacy` and confirm it’s gone (refresh and re‑open the app)

### What’s in scope
- Journaling, tags, prompts, search, export/delete
- Email/password + magic link auth
- Offline/local‑first use

### Out of scope (don’t test)
- Google/Microsoft OAuth, calendar integration, reminders, meditation playback, premium/enterprise

### Feedback
- Report bugs or suggestions in GitHub Issues: https://github.com/WinstonAC/heijo.mini-jounral/issues
- Or email: support@heijo.io
- Include browser and OS, steps to reproduce, and screenshots if possible

### Known tips
- If voice input doesn’t appear, check browser microphone permissions and retry.
- If you used export/delete, confirm that new entries can still be created afterward.


