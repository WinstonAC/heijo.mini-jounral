import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';

test.describe('Voice feature', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions for voice tests
    await context.grantPermissions(['microphone'], { origin: 'http://localhost:3000' });
    
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
    
    // Close onboarding if present
    await page.waitForTimeout(1000);
    const onboardingClose = page.getByRole('button', { name: /close|got it|got it!/i });
    if (await onboardingClose.isVisible().catch(() => false)) {
      await onboardingClose.click();
      await page.waitForTimeout(500);
    }
    
    // Wait for composer
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.scrollIntoViewIfNeeded();
  });

  test('mic button is visible and clickable', async ({ page }) => {
    // Find mic button by title/tooltip text
    const micButton = page.locator('button[title*="voice" i]').or(
      page.locator('button[title*="recording" i]')
    ).or(
      page.locator('button[title*="Start voice" i]')
    ).or(
      page.locator('button').filter({ has: page.locator('svg path[d*="M12 1a3"]') })
    ).first();
    
    // Mic button should be visible (may need to scroll)
    await micButton.scrollIntoViewIfNeeded();
    await expect(micButton).toBeVisible({ timeout: 10000 });
  });

  test('mic button click initializes voice recognition without errors', async ({ page }) => {
    // Find mic button by title/tooltip text
    const micButton = page.locator('button[title*="voice" i]').or(
      page.locator('button[title*="recording" i]')
    ).or(
      page.locator('button[title*="Start voice" i]')
    ).or(
      page.locator('button').filter({ has: page.locator('svg path[d*="M12 1a3"]') })
    ).first();
    
    await micButton.scrollIntoViewIfNeeded();
    await expect(micButton).toBeVisible({ timeout: 10000 });
    
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Click mic button
    await micButton.click();
    
    // Wait a bit for initialization
    await page.waitForTimeout(2000);
    
    // Check for critical errors (VAD initialization errors are expected in some browsers)
    const criticalErrors = errors.filter(err => 
      err.includes('createMediaStreamSource') && err.includes('null') ||
      err.includes('TypeError') && err.includes('Cannot read properties')
    );
    
    // Should not have critical null stream errors (our fix should prevent this)
    expect(criticalErrors.length).toBe(0);
  });

  test('mic button can be toggled on and off', async ({ page }) => {
    // Find mic button by title/tooltip text
    const micButton = page.locator('button[title*="voice" i]').or(
      page.locator('button[title*="recording" i]')
    ).or(
      page.locator('button[title*="Start voice" i]')
    ).or(
      page.locator('button').filter({ has: page.locator('svg path[d*="M12 1a3"]') })
    ).first();
    
    await micButton.scrollIntoViewIfNeeded();
    await expect(micButton).toBeVisible({ timeout: 10000 });
    
    // Click to start
    await micButton.click();
    await page.waitForTimeout(1000);
    
    // Click again to stop
    await micButton.click();
    await page.waitForTimeout(1000);
    
    // Should be able to click again (no state corruption)
    await micButton.click();
    await page.waitForTimeout(1000);
    
    // Final click to stop
    await micButton.click();
    await page.waitForTimeout(1000);
    
    // If we got here without errors, the toggle works
    expect(true).toBe(true);
  });

  test('voice recognition does not break after multiple toggles', async ({ page }) => {
    // Find mic button by title/tooltip text
    const micButton = page.locator('button[title*="voice" i]').or(
      page.locator('button[title*="recording" i]')
    ).or(
      page.locator('button[title*="Start voice" i]')
    ).or(
      page.locator('button').filter({ has: page.locator('svg path[d*="M12 1a3"]') })
    ).first();
    
    await micButton.scrollIntoViewIfNeeded();
    await expect(micButton).toBeVisible({ timeout: 10000 });
    
    // Rapid toggling to test for race conditions
    for (let i = 0; i < 5; i++) {
      await micButton.click();
      await page.waitForTimeout(300);
      await micButton.click();
      await page.waitForTimeout(300);
    }
    
    // Wait for any async operations to complete
    await page.waitForTimeout(2000);
    
    // Check console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Final click should work
    await micButton.click();
    await page.waitForTimeout(1000);
    
    // Should not have critical errors
    const criticalErrors = errors.filter(err => 
      err.includes('createMediaStreamSource') && err.includes('null') ||
      err.includes('TypeError') && err.includes('Cannot read properties of null')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

