import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';

test.describe('Paragraph writing and save', () => {
  test('can write a whole paragraph and save successfully', async ({ page }) => {
    // Sign in first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.getByPlaceholder('Enter your email');
    const passwordInput = page.getByPlaceholder('Enter your password');
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });
    
    await page.waitForURL(/\/journal/, { timeout: 15000 });
    
    // Wait for page to load
    await expect(page.getByText(/Heijō/i).first()).toBeVisible({ timeout: 15000 });
    
    // Close welcome/onboarding overlay if present
    await page.waitForTimeout(1500);
    
    // Strategy 1: Look for "Got it!" or "Start journaling" button
    const gotItBtn = page.getByRole('button', { name: /got it|start journaling/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    
    // Strategy 2: Handle prompt overlay if present
    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    
    // Wait for overlay to be gone
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 10000 }).catch(() => {});
    
    // Then wait for Composer textarea - it might need to scroll into view
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.scrollIntoViewIfNeeded();
    
    // Track console errors and warnings
    const consoleMessages: string[] = [];
    const errorBanners: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      // Check for error banners or notifications
      if (text.includes('speaking too fast') || 
          text.includes('Rate limit') ||
          (text.includes('error') && msg.type() === 'error')) {
        errorBanners.push(text);
      }
    });
    
    // Create entry using textarea and manually save - use same pattern as journal.spec.ts
    const paragraphText = `This is a complete paragraph test for the Heijō journal application. We need to verify that users can write multiple sentences and save them successfully. The text should persist correctly and be retrievable from the entry history. This test ensures the save functionality works properly for longer form content. Let's make sure everything is working as expected.`;
    
    await textarea.fill(paragraphText);
    await page.waitForTimeout(500);
    
    // Verify text is in textarea
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toContain('complete paragraph test');
    expect(textareaValue.length).toBeGreaterThan(100);
    
    // Find and click Save button
    let saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button[aria-label*="Save entry" i]').first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button[title*="Save" i]').first();
    }
    
    // Verify save button is visible
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    
    // Wait for debounce period to pass (SAVE_DEBOUNCE_MS is 2000ms)
    await page.waitForTimeout(2500);
    
    // Click save
    await saveButton.click({ force: true });
    await page.waitForTimeout(3000); // Wait for save to complete
    
    // Verify textarea is cleared after save
    const textareaValueAfterSave = await textarea.inputValue();
    expect(textareaValueAfterSave).toBe('');
    
    // Check for error banners in the DOM
    const rateLimitBanner = page.locator('text=/Rate limit/i');
    const errorBanner = page.locator('.fixed').filter({ hasText: /error|speaking too fast/i });
    
    // Verify no error banners are visible
    if (await rateLimitBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
      throw new Error('Rate limit banner is visible');
    }
    if (await errorBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
      throw new Error('Error banner is visible');
    }
    
    // Open history to verify entry was saved
    const historyBtn = page.getByRole('button', { name: /history/i }).or(
      page.locator('button').filter({ hasText: /^H$/ })
    ).first();
    
    if (await historyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }
    
    // Verify the paragraph text appears in the saved entries
    await expect(page.getByText(/complete paragraph test/i).first()).toBeVisible({ timeout: 10000 });
    
    // Verify no critical console errors about save failures
    const saveErrors = consoleMessages.filter(msg => 
      msg.includes('Failed to save') ||
      msg.includes('save failed') ||
      msg.includes('Rate limit exceeded')
    );
    
    // Log console messages for debugging
    if (consoleMessages.length > 0) {
      console.log('Console messages:', consoleMessages.slice(0, 10));
    }
    
    // Should not have save-related errors
    expect(saveErrors.length).toBe(0);
  });
});

