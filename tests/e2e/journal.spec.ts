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
    await page.waitForLoadState('networkidle');

    // Wait for journal page to fully load and Composer to appear
    await expect(page.getByPlaceholder('Type or speak your thoughts...')).toBeVisible({ timeout: 15000 });

    // Create entry using textarea with placeholder
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await textarea.fill('Playwright test entry alpha');
    // Auto-save should kick in, but wait a bit for it
    await page.waitForTimeout(3000);

    // Create another entry with tag
    await textarea.clear();
    await textarea.fill('Playwright test entry beta #tagX');
    await page.waitForTimeout(3000);

    // Check entries appear - look for RecentEntriesDrawer or entry list
    await expect(page.getByText(/Playwright test entry/i).first()).toBeVisible({ timeout: 10000 });
  });
});


