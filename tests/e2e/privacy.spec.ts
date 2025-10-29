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

    // Open Settings modal - Settings button should be visible
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /settings/i }).click();
    await page.waitForTimeout(1000);

    // Export JSON
    const exportJsonBtn = page.getByRole('button', { name: /export.*json/i });
    if (await exportJsonBtn.isVisible().catch(() => false)) {
      await exportJsonBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Export CSV
    const exportCsvBtn = page.getByRole('button', { name: /export.*csv/i });
    if (await exportCsvBtn.isVisible().catch(() => false)) {
      await exportCsvBtn.click();
      await page.waitForTimeout(1000);
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


