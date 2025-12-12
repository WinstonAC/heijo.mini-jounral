# Comprehensive Application Testing Guide

**Last Updated**: January 2025  
**Test File**: `tests/e2e/comprehensive.spec.ts`

## Overview

This comprehensive test suite covers all aspects of the Heijō Mini-Journal application:

1. ✅ **Form Filling** - All forms with valid and invalid test data
2. ✅ **Workflow Testing** - Complete user journeys from signup to entry creation
3. ✅ **Responsive Design** - Mobile, tablet, and desktop viewports
4. ✅ **Error Message Validation** - All error states and messages
5. ✅ **Console Error Monitoring** - JavaScript errors and warnings

## Running the Tests

### Prerequisites

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Set environment variables** (optional, uses defaults if not set):
   ```bash
   export TEST_EMAIL=testrunner+01@heijo.io
   export TEST_PASSWORD=Heijo-Test-2025!
   ```

3. **Ensure test account is confirmed** in Supabase:
   - Go to Supabase Dashboard → Authentication → Users
   - Find the test account email
   - Confirm the email if not already confirmed

### Run All Comprehensive Tests

```bash
npm run test:e2e:comprehensive
```

### Run Specific Test

```bash
# Run a specific test by name
npx playwright test tests/e2e/comprehensive.spec.ts -g "Authentication Forms"

# Run with UI mode (interactive)
npx playwright test tests/e2e/comprehensive.spec.ts --ui

# Run in headed mode (see browser)
npx playwright test tests/e2e/comprehensive.spec.ts --headed
```

### View Test Report

```bash
npm run test:e2e:report
```

## Test Coverage

### 1. Authentication Forms - Valid and Invalid Inputs
- ✅ Invalid email format validation
- ✅ Empty field validation
- ✅ Valid credentials sign in
- ✅ Magic link form validation
- ✅ Sign up flow

**Test Data Used:**
- Valid email: `testrunner+01@heijo.io`
- Invalid email: `invalid-email`
- Valid password: `Heijo-Test-2025!`
- Short password: `123`

### 2. Journal Entry Forms - Text Input and Auto-save
- ✅ Short content (should not auto-save)
- ✅ Long content auto-save (7 second timeout)
- ✅ Manual save functionality
- ✅ Empty entry save attempt (error handling)

**Test Data Used:**
- Entry 1: "This is my first test journal entry. It contains multiple sentences to test auto-save functionality."
- Entry 2: "Second entry with #tag1 and #tag2 to test tagging functionality."

### 3. Tag Selection and Entry with Tags
- ✅ Tag picker interaction (desktop)
- ✅ Tag selection
- ✅ Entry creation with tags
- ✅ Tag persistence

### 4. Settings Forms - All Toggles and Inputs
- ✅ Font size selection (S/M/L)
- ✅ Consent toggles (Microphone, Local Storage, Premium, Analytics)
- ✅ Language selector
- ✅ Export button state (disabled when no entries)

### 5. Error Message Validation
- ✅ Login form errors (invalid email, empty fields)
- ✅ Journal entry errors (empty entry save)
- ✅ Form validation messages
- ✅ Button disabled states

### 6. Responsive Design - Mobile Viewport (375x667)
- ✅ Mobile login form layout
- ✅ Mobile textarea and save button
- ✅ Mobile navigation (History button)
- ✅ Mobile settings modal

### 7. Responsive Design - Tablet Viewport (768x1024)
- ✅ Tablet layout verification
- ✅ Tablet-specific element visibility

### 8. Responsive Design - Desktop Viewport (1920x1080)
- ✅ Desktop layout verification
- ✅ Desktop mic button (if supported)
- ✅ Desktop-specific features

### 9. Complete User Workflow - Sign Up to Entry Creation
- ✅ New user sign up
- ✅ Email confirmation message
- ✅ Sign in after signup
- ✅ First entry creation
- ✅ End-to-end user journey

### 10. Console Error Monitoring
- ✅ JavaScript console errors
- ✅ Page errors (unhandled exceptions)
- ✅ Error logging and reporting
- ✅ Critical error detection

## Test Data

The test suite uses the following test data:

```typescript
const TEST_ENTRIES = [
  'This is my first test journal entry. It contains multiple sentences to test auto-save functionality.',
  'Second entry with #tag1 and #tag2 to test tagging functionality.',
  'Third entry to test search functionality. Contains keywords: coffee, morning, reflection.',
  'Fourth entry with special characters: !@#$%^&*() and emoji: 😊 🌟',
];
```

## Expected Behaviors

### Form Validation
- Email inputs should validate format
- Password inputs should have minimum length requirements
- Empty required fields should disable submit buttons
- Invalid inputs should show error messages

### Auto-save
- Auto-save triggers after 7 seconds of inactivity
- Only saves if content is > 10 characters
- Shows "Auto-saving..." indicator
- Updates "Entry saved" timestamp

### Error Messages
- Empty entry save shows: "Entry cannot be empty"
- Invalid email shows browser validation or custom error
- Rate limit shows: "Rate limit exceeded. Please try again later."

### Responsive Design
- Mobile: Single column layout, bottom navigation
- Tablet: Optimized layout for medium screens
- Desktop: Full layout with all features visible

## Troubleshooting

### Tests Fail with "Email not confirmed"
**Solution**: Confirm the test account email in Supabase Dashboard:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'testrunner+01@heijo.io';
```

### Tests Fail with "Textarea not found"
**Solution**: The test automatically dismisses onboarding modals, but if it still fails:
- Check that the dev server is running
- Verify the page has fully loaded
- Check browser console for JavaScript errors

### Console Errors Detected
**Note**: The test logs console errors but only fails on critical unhandled exceptions. Warnings and expected errors (like analytics) are allowed.

### Rate Limiting
If tests fail due to rate limiting:
- Wait a few minutes between test runs
- Or use different test accounts for parallel runs

## Continuous Integration

To run these tests in CI:

```yaml
# Example GitHub Actions workflow
- name: Run Comprehensive E2E Tests
  run: |
    npm run dev &
    sleep 10
    npm run test:e2e:comprehensive
```

## Test Maintenance

### Adding New Test Cases

1. Add test data to `TEST_ENTRIES` array
2. Create new test function in `comprehensive.spec.ts`
3. Follow existing patterns for:
   - Modal dismissal
   - Element waiting
   - Error checking

### Updating Test Data

Modify the constants at the top of `comprehensive.spec.ts`:
```typescript
const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';
```

## Results Interpretation

### Passing Tests ✅
- All functionality works as expected
- No critical console errors
- Forms validate correctly
- Responsive design works

### Failing Tests ❌
- Check the error message in the test output
- Review browser console for JavaScript errors
- Verify test account is confirmed
- Check that dev server is running

### Partial Failures ⚠️
- Some tests may fail due to timing issues
- Check if modals need additional dismissal logic
- Verify element selectors are still valid

## Next Steps

After running comprehensive tests:

1. **Review Test Report**: `npm run test:e2e:report`
2. **Fix Any Failures**: Address critical issues first
3. **Update Test Data**: If new features require new test data
4. **Add Edge Cases**: Test boundary conditions
5. **Performance Testing**: Add performance benchmarks if needed

---

**For questions or issues**, refer to:
- `docs/QA_MATRIX.md` - Feature test matrix
- `docs/TESTING_READINESS.md` - Testing readiness report
- `docs/TESTER_ONBOARDING.md` - Manual testing guide

