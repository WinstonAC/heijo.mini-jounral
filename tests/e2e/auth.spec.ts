import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';

test.describe('Auth', () => {
  test('sign up if needed, then sign in', async ({ page }) => {
    await page.goto('/login');

    // If already signed in, navigate to journal to confirm
    await expect(page.getByText('Welcome to')).toBeVisible();

    // Try sign up flow
    await page.getByText('Need an account? Sign up').click();
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click({ timeout: 10000 }).catch(() => {});

    // If sign up fails because user exists, proceed to sign in
    await page.goto('/login');
    await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/journal/);
    await expect(page).toHaveURL(/\/journal/);
  });
});


