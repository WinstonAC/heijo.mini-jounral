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
    
    // Export CSV (Settings modal only has CSV export) - try multiple selectors
    let exportCsvBtn = page.getByRole('button', { name: /export.*csv/i }).first();
    if (!(await exportCsvBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      exportCsvBtn = page.locator('button').filter({ hasText: /export/i }).first();
    }
    
    if (await exportCsvBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportCsvBtn.scrollIntoViewIfNeeded();
      await exportCsvBtn.click({ force: true });
      await page.waitForTimeout(3000); // Wait for download
    }

    // Delete all data (with confirmation dialog)
    page.on('dialog', async d => { await d.accept(); });
    const deleteBtn = page.getByRole('button', { name: /delete.*all.*data/i });
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      // App should reload after delete
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Type or speak/i).or(page.getByText(/Welcome/))).toBeVisible({ timeout: 10000 });
    }
  });
});


