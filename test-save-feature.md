# Save Feature Test Plan

## Pre-Test Setup
1. Open browser console (F12 or Cmd+Option+I)
2. Navigate to http://localhost:3000/journal
3. If rate limiter is blocking, reset it in console:
   ```javascript
   // In browser console
   const { rateLimiter } = await import('./lib/rateLimiter');
   await rateLimiter.reset();
   ```

## Test Cases

### 1. Manual Save (Desktop Save Button)
- [ ] Type some text in the journal textarea
- [ ] Click the "S" button in the top-right
- [ ] Verify: Entry appears in history drawer
- [ ] Verify: Textarea clears
- [ ] Verify: No console errors
- [ ] Verify: No "Maximum update depth exceeded" warnings

### 2. Manual Save (Mobile Bottom Nav)
- [ ] Switch to mobile view (resize browser or use dev tools)
- [ ] Type some text
- [ ] Click save button in bottom nav
- [ ] Verify: Entry saves successfully
- [ ] Verify: No console errors

### 3. Auto-Save
- [ ] Type at least 10 characters
- [ ] Wait 7 seconds without typing
- [ ] Verify: Entry auto-saves (check console for "Auto-save" messages)
- [ ] Verify: Entry appears in history drawer
- [ ] Verify: No infinite loop warnings

### 4. Keyboard Shortcut
- [ ] Type some text
- [ ] Press Cmd+S (Mac) or Ctrl+S (Windows)
- [ ] Verify: Entry saves
- [ ] Verify: Textarea clears
- [ ] Verify: No console errors

### 5. Multiple Saves
- [ ] Save 3-5 entries in quick succession
- [ ] Verify: All entries save successfully
- [ ] Verify: No rate limit errors (unless you exceed 100 saves/hour)
- [ ] Verify: All entries appear in history drawer

### 6. Rate Limiter Check
- [ ] If rate limited, verify error message is clear
- [ ] Verify: Rate limiter resets after 1 hour window
- [ ] Verify: Can reset manually for development

## Expected Console Output
- ✅ "Save triggered via keyboard shortcut" (when using Cmd+S)
- ✅ No "Maximum update depth exceeded" warnings
- ✅ No "Failed to save entry" errors (unless network/Supabase issue)
- ✅ No infinite loop warnings

## Common Issues to Watch For
- ❌ "Maximum update depth exceeded" → Infinite loop (should be fixed)
- ❌ "Failed to save entry" → Check rate limiter or network
- ❌ "Rate limit exceeded" → Reset rate limiter for testing
- ❌ Entries not appearing → Check localStorage or Supabase connection

