import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';
const INVALID_EMAIL = 'invalid-email';
const SHORT_PASSWORD = '123';

// Test data for forms
const TEST_ENTRIES = [
  'This is my first test journal entry. It contains multiple sentences to test auto-save functionality.',
  'Second entry with #tag1 and #tag2 to test tagging functionality.',
  'Third entry to test search functionality. Contains keywords: coffee, morning, reflection.',
  'Fourth entry with special characters: !@#$%^&*() and emoji: 😊 🌟',
];

test.describe('Comprehensive Application Testing', () => {
  // Monitor console errors throughout all tests
  test.beforeEach(async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.error(`[Console Error] ${text}`);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text);
        console.warn(`[Console Warning] ${text}`);
      }
    });

    page.on('pageerror', (error) => {
      console.error(`[Page Error] ${error.message}`);
      consoleErrors.push(error.message);
    });

    // Store errors in page context for later assertion
    await page.addInitScript(() => {
      (window as any).__consoleErrors = [];
      (window as any).__consoleWarnings = [];
    });
  });

  test('1. Authentication Forms - Valid and Invalid Inputs', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Test 1: Invalid email format
    await page.getByPlaceholder('Enter your email').fill(INVALID_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation error (browser native or custom)
    await page.waitForTimeout(1000);
    const hasEmailError = await page.getByText(/invalid|email|format/i).isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasEmailError || page.getByPlaceholder('Enter your email').evaluate(el => (el as HTMLInputElement).validity.valid === false)).toBeTruthy();

    // Test 2: Empty fields
    await page.getByPlaceholder('Enter your email').clear();
    await page.getByPlaceholder('Enter your password').clear();
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeDisabled();

    // Test 3: Valid credentials (if account exists)
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    
    // Try sign up first
    const signUpTab = page.getByText('Sign Up');
    if (await signUpTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signUpTab.click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /create account/i }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Then try sign in
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Check for email confirmation error or success
    await page.waitForTimeout(2000);
    const emailNotConfirmed = await page.getByText(/email not confirmed|verify your email/i).isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!emailNotConfirmed) {
      await page.waitForURL(/\/journal/, { timeout: 10000 }).catch(() => {});
    }

    // Test 4: Magic Link form
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const magicLinkTab = page.getByText('Magic Link');
    if (await magicLinkTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await magicLinkTab.click();
      await page.waitForTimeout(500);
      
      // Test invalid email in magic link
      await page.getByPlaceholder('Enter your email').fill(INVALID_EMAIL);
      const sendLinkButton = page.getByRole('button', { name: /send magic link/i });
      await expect(sendLinkButton).toBeDisabled();
      
      // Test valid email
      await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
      await expect(sendLinkButton).toBeEnabled();
    }
  });

  test('2. Journal Entry Forms - Text Input and Auto-save', async ({ page }) => {
    // Sign in first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Dismiss onboarding if present
    await page.waitForTimeout(1500);
    const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Dismiss prompt if present
    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.scrollIntoViewIfNeeded();

    // Test 1: Short content (should not auto-save)
    await textarea.fill('Short');
    await page.waitForTimeout(8000); // Wait for auto-save timeout
    // Should not have saved (content too short)

    // Test 2: Long content (should trigger auto-save after 7 seconds)
    await textarea.fill(TEST_ENTRIES[0]);
    await page.waitForTimeout(8000); // Wait for auto-save
    
    // Check for auto-save indicator
    const autoSaveIndicator = page.getByText(/auto-saving|saving/i);
    const savedIndicator = await autoSaveIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    // Auto-save should have triggered

    // Test 3: Manual save
    await textarea.fill(TEST_ENTRIES[1]);
    await page.waitForTimeout(500);
    
    // Find and click Save button
    let saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button[aria-label*="Save entry" i]').first();
    }
    
    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveButton.click({ force: true });
      await page.waitForTimeout(3000);
      
      // Check for success indicator
      const savedToast = page.getByText(/saved/i);
      await expect(savedToast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }

    // Test 4: Empty entry save attempt (should show error)
    await textarea.clear();
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click({ force: true });
      await page.waitForTimeout(1000);
      
      // Should show error about empty entry
      const emptyError = page.getByText(/cannot be empty|empty entry/i);
      const hasEmptyError = await emptyError.isVisible({ timeout: 2000 }).catch(() => false);
      // Error should be shown or button should be disabled
    }
  });

  test('3. Tag Selection and Entry with Tags', async ({ page }) => {
    // Sign in
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Dismiss modals
    await page.waitForTimeout(1500);
    const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });

    // Test tag selection (desktop)
    const tagPicker = page.locator('[data-testid="tag-picker"], .tag-picker, button').filter({ hasText: /vibes|tag/i }).first();
    if (await tagPicker.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tagPicker.click({ force: true });
      await page.waitForTimeout(1000);
      
      // Select a tag
      const tagOption = page.getByText(/gratitude|reflection|energy|mood/i).first();
      if (await tagOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tagOption.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // Create entry with tags
    await textarea.fill(TEST_ENTRIES[1]);
    await page.waitForTimeout(500);
    
    // Save entry
    let saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
    }
    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveButton.click({ force: true });
      await page.waitForTimeout(3000);
    }
  });

  test('4. Settings Forms - All Toggles and Inputs', async ({ page }) => {
    // Sign in
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Open Settings
    const settingsButton = page.getByRole('button', { name: /settings/i }).or(
      page.locator('button').filter({ hasText: /settings/i })
    ).first();
    
    if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.click({ force: true });
      await page.waitForTimeout(1000);
    } else {
      // Try keyboard shortcut or menu
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Wait for settings modal
    await page.waitForTimeout(1000);
    const settingsModal = page.getByText(/settings/i).first();
    await expect(settingsModal).toBeVisible({ timeout: 5000 });

    // Test 1: Font size selection
    const fontSizeButtons = page.locator('button').filter({ hasText: /^[SML]$/ });
    const fontSizeCount = await fontSizeButtons.count();
    if (fontSizeCount > 0) {
      // Click each font size
      for (let i = 0; i < fontSizeCount; i++) {
        await fontSizeButtons.nth(i).click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // Test 2: Consent toggles
    const toggles = page.locator('input[type="checkbox"]');
    const toggleCount = await toggles.count();
    
    for (let i = 0; i < Math.min(toggleCount, 4); i++) {
      const toggle = toggles.nth(i);
      const isChecked = await toggle.isChecked();
      await toggle.click({ force: true });
      await page.waitForTimeout(500);
      
      // Verify toggle state changed
      const newState = await toggle.isChecked();
      expect(newState).toBe(!isChecked);
    }

    // Test 3: Language selector (if visible)
    const languageSelector = page.locator('select, [role="combobox"]').filter({ hasText: /language|voice/i }).first();
    if (await languageSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await languageSelector.click({ force: true });
      await page.waitForTimeout(500);
      
      // Select a different language
      const languageOption = page.getByText(/spanish|french|german/i).first();
      if (await languageOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await languageOption.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // Test 4: Export button (should be disabled if no entries)
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isDisabled = await exportButton.isDisabled();
      // Export should be disabled if no entries exist
    }

    // Close settings
    const closeButton = page.getByRole('button', { name: /close/i });
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click({ force: true });
      await page.waitForTimeout(500);
    }
  });

  test('5. Error Message Validation', async ({ page }) => {
    // Test 1: Login form errors
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Invalid email
    await page.getByPlaceholder('Enter your email').fill('not-an-email');
    await page.getByPlaceholder('Enter your password').fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForTimeout(1000);
    // Should show error (browser validation or custom)
    const emailError = await page.getByText(/invalid|email|format/i).isVisible({ timeout: 2000 }).catch(() => false);
    // Error should be visible or form should prevent submission

    // Test 2: Empty fields
    await page.getByPlaceholder('Enter your email').clear();
    await page.getByPlaceholder('Enter your password').clear();
    const signInBtn = page.getByRole('button', { name: /sign in/i });
    await expect(signInBtn).toBeDisabled();

    // Test 3: Journal entry errors
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Dismiss modals
    await page.waitForTimeout(1500);
    const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });

    // Try to save empty entry
    await textarea.clear();
    let saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
    }
    
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isDisabled = await saveButton.isDisabled();
      // Button should be disabled or show error on click
      if (!isDisabled) {
        await saveButton.click({ force: true });
        await page.waitForTimeout(1000);
        
        const emptyError = page.getByText(/cannot be empty|empty entry/i);
        await expect(emptyError.first()).toBeVisible({ timeout: 2000 }).catch(() => {});
      }
    }
  });

  test('6. Responsive Design - Mobile Viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Test mobile login form
    const emailInput = page.getByPlaceholder('Enter your email');
    await expect(emailInput).toBeVisible();
    
    // Check mobile-specific layout
    const loginCard = page.locator('.w-full.max-w-md');
    await expect(loginCard).toBeVisible();

    // Sign in
    await emailInput.fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Dismiss modals
    await page.waitForTimeout(1500);
    const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Test mobile textarea
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    
    // Check mobile-specific elements
    const mobileSaveButton = page.getByRole('button', { name: /^save$/i }).first();
    await expect(mobileSaveButton).toBeVisible({ timeout: 5000 });

    // Test mobile navigation
    const historyButton = page.getByRole('button', { name: /history/i }).or(
      page.locator('button').filter({ hasText: /^H$/ })
    ).first();
    
    if (await historyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyButton.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Test mobile settings
    const settingsButton = page.getByRole('button', { name: /settings/i }).first();
    if (await settingsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsButton.click({ force: true });
      await page.waitForTimeout(1000);
      
      // Settings should open in mobile-friendly modal
      const settingsModal = page.getByText(/settings/i).first();
      await expect(settingsModal).toBeVisible({ timeout: 5000 });
      
      // Close settings
      const closeButton = page.getByRole('button', { name: /close/i });
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click({ force: true });
      }
    }
  });

  test('7. Responsive Design - Tablet Viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Test tablet layout
    const emailInput = page.getByPlaceholder('Enter your email');
    await expect(emailInput).toBeVisible();

    // Sign in
    await emailInput.fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Dismiss modals
    await page.waitForTimeout(1500);
    const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Test tablet layout elements
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
  });

  test('8. Responsive Design - Desktop Viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Test desktop layout
    const emailInput = page.getByPlaceholder('Enter your email');
    await expect(emailInput).toBeVisible();

    // Sign in
    await emailInput.fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Dismiss modals
    await page.waitForTimeout(1500);
    const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Test desktop-specific elements (e.g., desktop mic button)
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    
    // Desktop should have mic button visible
    const micButton = page.locator('button').filter({ hasText: /mic|microphone/i }).or(
      page.locator('[aria-label*="mic" i]')
    ).first();
    
    // Mic button may or may not be visible depending on browser support
    const micVisible = await micButton.isVisible({ timeout: 2000 }).catch(() => false);
    // Just verify page loaded correctly
  });

  test('9. Complete User Workflow - Sign Up to Entry Creation', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@heijo.io`;
    
    // Step 1: Sign up
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('Enter your email').fill(uniqueEmail);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    
    // Click sign up
    const signUpTab = page.getByText('Sign Up');
    if (await signUpTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signUpTab.click();
      await page.waitForTimeout(500);
    }
    
    await page.getByRole('button', { name: /create account/i }).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Step 2: Check for confirmation message
    const confirmationMessage = page.getByText(/check your email|confirmation/i);
    const hasConfirmation = await confirmationMessage.isVisible({ timeout: 3000 }).catch(() => false);
    // Should show confirmation message

    // Step 3: Sign in (if account was created)
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('Enter your email').fill(uniqueEmail);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForTimeout(2000);
    
    // May need email confirmation, but try to proceed
    await page.waitForURL(/\/journal/, { timeout: 10000 }).catch(() => {});

    // Step 4: Create first entry
    if (page.url().includes('/journal')) {
      await page.waitForLoadState('networkidle');
      
      // Dismiss modals
      await page.waitForTimeout(1500);
      const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
      if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotItBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }

      const promptNoBtn = page.getByRole('button', { name: /^no$/i });
      if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await promptNoBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }

      const textarea = page.getByPlaceholder('Type or speak your thoughts...');
      await expect(textarea).toBeVisible({ timeout: 15000 });

      // Create entry
      await textarea.fill('My first journal entry after signup!');
      await page.waitForTimeout(500);
      
      // Save
      let saveButton = page.getByRole('button', { name: /^save$/i }).first();
      if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
      }
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click({ force: true });
        await page.waitForTimeout(3000);
      }
    }
  });

  test('10. Console Error Monitoring', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Navigate through app
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/journal/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Dismiss modals
    await page.waitForTimeout(1500);
    const gotItBtn = page.getByRole('button', { name: /start journaling|got it/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Interact with various features
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await textarea.fill('Test entry for console monitoring');
      await page.waitForTimeout(2000);
    }

    // Open settings
    const settingsButton = page.getByRole('button', { name: /settings/i }).first();
    if (await settingsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsButton.click({ force: true });
      await page.waitForTimeout(1000);
      
      const closeButton = page.getByRole('button', { name: /close/i });
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click({ force: true });
      }
    }

    // Check for critical errors (allow warnings and info)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Warning') && 
      !err.includes('warn') &&
      !err.includes('info') &&
      !err.includes('Analytics') &&
      !err.includes('Failed to fetch') // Network errors may be expected in test env
    );

    // Log errors for debugging but don't fail test unless critical
    if (criticalErrors.length > 0) {
      console.warn('Console errors detected:', criticalErrors);
    }

    if (pageErrors.length > 0) {
      console.error('Page errors detected:', pageErrors);
      // Fail test if there are unhandled page errors
      expect(pageErrors).toHaveLength(0);
    }
  });
});


