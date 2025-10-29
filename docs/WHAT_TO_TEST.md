## Heijō Mini‑Journal — What To Test (1‑Pager)

### Browsers
- Chrome (latest), Safari 16+, Firefox (latest), Edge (latest)

### Scenarios
1) Auth
   - Sign up with email/password
   - Sign in/out
   - Optional: Magic link sign in

2) Journaling
   - Create, edit, and delete entries
   - Add/remove tags; filter/search entries
   - Voice entry (if your browser supports Web Speech API)

3) Persistence
   - Refresh the page; entries remain
   - Close and reopen the browser; entries remain

4) Privacy
   - Visit `/privacy` → Export JSON or CSV; file downloads and is valid
   - Delete all data; verify entries are gone after refresh

5) Offline (optional)
   - Disable network; create and view entries (sync not required)

### Bugs to log
- Auth failures, data not saving/loading, search/tag issues, export file invalid, delete not clearing, UI blocking issues.

### Report issues
- GitHub Issues: https://github.com/WinstonAC/heijo.mini-jounral/issues
- Or email: support@heijo.io
  - Add: browser + OS, steps, expected vs actual, screenshots if possible


