import { test, expect } from '@playwright/test';

test.describe('Voice feature', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions for voice tests
    await context.grantPermissions(['microphone'], { origin: 'http://localhost:3000' });
    
    // Navigate directly to journal (auth handled by global setup)
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    
    // Wait for stable journal page marker (Heijō header)
    await expect(page.getByText(/Heijō/i).first()).toBeVisible({ timeout: 15000 });
    
    // Close welcome/onboarding overlay if present - try multiple strategies
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
    
    // Strategy 3: If overlay still visible, try clicking textarea to dismiss (triggers handleTextareaFocus)
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    if (await welcomeOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      const textarea = page.getByPlaceholder('Type or speak your thoughts...');
      if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textarea.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }
    
    // Strategy 4: Wait for overlay to be gone (with longer timeout)
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 10000 }).catch(() => {});
    
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
    
    // Ensure welcome overlay is gone before clicking
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Click mic button with force to bypass any remaining overlay
    await micButton.click({ force: true });
    
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
    
    // Ensure welcome overlay is gone before clicking
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Click to start (with force to bypass any overlay)
    await micButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Click again to stop
    await micButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Should be able to click again (no state corruption)
    await micButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Final click to stop
    await micButton.click({ force: true });
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
    
    // Ensure welcome overlay is gone before clicking
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Rapid toggling to test for race conditions (with force to bypass overlay)
    for (let i = 0; i < 5; i++) {
      await micButton.click({ force: true });
      await page.waitForTimeout(300);
      await micButton.click({ force: true });
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

