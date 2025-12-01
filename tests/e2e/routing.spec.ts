import { test, expect } from '@playwright/test';

test('core routes render', async ({ page }) => {
  // Root route redirects to /login via client-side useEffect
  await page.goto('/');
  // Wait for navigation to complete (client-side redirect)
  await page.waitForURL(/\/login/, { timeout: 5000 }).catch(async () => {
    // If redirect hasn't happened yet, wait a bit more and check again
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
  });

  await page.goto('/login');
  await expect(page.getByText(/Welcome to.*Heijō/i)).toBeVisible();

  await page.goto('/privacy');
  // Privacy page shows "Privacy Policy" heading, use first match
  await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
});


