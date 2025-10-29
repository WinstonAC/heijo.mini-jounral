import { test, expect } from '@playwright/test';

test('core routes render', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/); // redirected

  await page.goto('/login');
  await expect(page.getByText(/Welcome to.*Heijō/i)).toBeVisible();

  await page.goto('/privacy');
  // Privacy page shows "Privacy Policy" heading, use first match
  await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
});


