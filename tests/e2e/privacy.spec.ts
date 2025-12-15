import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';

test.describe('Privacy export/delete', () => {
  test('export JSON/CSV and delete all data', async ({ page }) => {
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
    
    // --- Seed at least one entry so Export/Delete are enabled ---
    const textbox = page.getByRole('textbox', { name: /type or speak/i });
    await expect(textbox).toBeVisible();

    await textbox.fill('Test entry for privacy export/delete');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/saved|entry/i)).toBeVisible().catch(() => {}); // optional if you have a toast
    
    // Find and click Settings button to open Settings modal
    // Try multiple selectors for Settings button
    let settingsBtn;
    try {
      settingsBtn = page.getByRole('button', { name: 'Settings', exact: true });
      await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    } catch {
      // Fallback: find button by text content
      settingsBtn = page.locator('button').filter({ hasText: /^Settings$/ });
      await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    }
    await settingsBtn.scrollIntoViewIfNeeded();
    // Use force click to bypass any remaining overlay
    await settingsBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Wait for Settings modal to be visible and scrollable
    await page.waitForTimeout(2000);
    
    // Settings modal should be open - scroll to find export button
    const settingsModal = page.locator('[role="dialog"]').or(
      page.locator('.fixed.inset-0').filter({ has: page.getByText(/Settings/i) })
    ).first();
    
    if (await settingsModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Scroll within modal to find export button
      await settingsModal.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }
    
    // Export CSV (best practice: wait for download)
    const exportCsvBtn = page.getByRole('button', { name: /export.*csv/i });
    await expect(exportCsvBtn).toBeEnabled();
    
    const downloadPromise = page.waitForEvent('download');
    await exportCsvBtn.click();
    const download = await downloadPromise;
    await download.path(); // ensures it actually downloaded (or use saveAs)

    // Delete all data
    const deleteBtn = page.getByRole('button', { name: /delete.*all.*data/i });
    await expect(deleteBtn).toBeEnabled();
    
    // If your app uses a custom modal instead of window.confirm, handle it here.
    // If it truly uses native dialog, keep this:
    page.once('dialog', d => d.accept());
    
    await deleteBtn.click();
    
    // App should reload after delete
    await page.waitForLoadState('networkidle');
    
    // Assert empty state after delete (pick the most stable UI signal)
    await expect(page.getByText(/total entries/i).locator('..').getByText('0')).toBeVisible();
  });
});


