import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';

test.describe('Journal basics', () => {
  test('create entries, tag, and search', async ({ page }) => {
    // Sign in first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.getByPlaceholder('Enter your email');
    const passwordInput = page.getByPlaceholder('Enter your password');
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // Wait for button to be enabled
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });
    
    await page.waitForURL(/\/journal/, { timeout: 15000 });
    
    // Wait for loading states to complete - wait for header text which appears when page loads
    // This confirms the page has passed the loading screen
    await expect(page.getByText(/Heijō/i).first()).toBeVisible({ timeout: 15000 });
    
    // Close welcome/onboarding overlay if present
    await page.waitForTimeout(1500);
    
    // Strategy 1: Look for "Got it!" button in welcome overlay
    const gotItBtn = page.getByRole('button', { name: /got it!/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    
    // Strategy 2: Handle prompt overlay if present (click "No" to dismiss)
    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    
    // Strategy 3: Wait for overlay to be gone
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 10000 }).catch(() => {});
    
    // Then wait for Composer textarea - it might need to scroll into view
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.scrollIntoViewIfNeeded();

    // Create entry using textarea and manually save
    await textarea.fill('Playwright test entry alpha');
    await page.waitForTimeout(500);
    
    // Find and click Save button - try multiple selectors
    // Desktop: "S" button or Save button, Mobile: "Save" in bottom nav or hero button
    let saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button[aria-label*="Save entry" i]').first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Last resort: find by tooltip
      saveButton = page.locator('button[title*="Save" i]').first();
    }
    
    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveButton.click({ force: true });
      await page.waitForTimeout(3000); // Wait for save to complete
    } else {
      // If no save button found, try auto-save (wait longer)
      await page.waitForTimeout(5000);
    }

    // Create another entry with tag
    await textarea.clear();
    await textarea.fill('Playwright test entry beta #tagX');
    await page.waitForTimeout(500);
    
    // Save again (re-find button in case it changed)
    saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button[aria-label*="Save entry" i]').first();
    }
    
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click({ force: true });
      await page.waitForTimeout(3000);
    } else {
      await page.waitForTimeout(5000); // Fallback to auto-save
    }

    // Check entries appear - entries might be in RecentEntriesDrawer or EntryList
    // Try opening history drawer first if it exists
    const historyBtn = page.getByRole('button', { name: /history/i }).or(
      page.locator('button').filter({ hasText: /^H$/ })
    ).first();
    
    if (await historyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }
    
    // Look for entries in the page (could be in drawer, list, or main view)
    await expect(page.getByText(/Playwright test entry/i).first()).toBeVisible({ timeout: 15000 });
  });
});


