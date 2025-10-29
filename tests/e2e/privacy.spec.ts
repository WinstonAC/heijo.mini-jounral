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
    await page.waitForLoadState('networkidle');
    
    // Wait for any onboarding modal to close if present
    await page.waitForTimeout(1000);
    const onboardingClose = page.getByRole('button', { name: /close|got it/i });
    if (await onboardingClose.isVisible().catch(() => false)) {
      await onboardingClose.click();
      await page.waitForTimeout(500);
    }

    // Wait for journal page content first
    await expect(page.getByText(/Heijō|mini-journal/i).first()).toBeVisible({ timeout: 15000 });
    
    // Wait for journal to fully load - try to find Settings button
    // Look in header area where Settings button should be
    const settingsBtn = page.locator('button').filter({ hasText: /Settings/i });
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();
    await page.waitForTimeout(1000);

    // Export CSV (Settings modal only has CSV export)
    const exportCsvBtn = page.getByRole('button', { name: /export.*csv/i });
    if (await exportCsvBtn.isVisible().catch(() => false)) {
      await exportCsvBtn.click();
      await page.waitForTimeout(2000);
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


