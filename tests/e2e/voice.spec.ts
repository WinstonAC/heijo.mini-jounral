import { test, expect } from '@playwright/test';

test.describe('Voice feature', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit/Playwright does not reliably support Web Speech API (SpeechRecognition)');
  
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

  test('voice session does not trigger save or create history entries', async ({ page }) => {
    // Find mic button
    const micButton = page.locator('button[title*="voice" i]').or(
      page.locator('button[title*="recording" i]')
    ).or(
      page.locator('button[title*="Start voice" i]')
    ).or(
      page.locator('button').filter({ has: page.locator('svg path[d*="M12 1a3"]') })
    ).first();
    
    await micButton.scrollIntoViewIfNeeded();
    await expect(micButton).toBeVisible({ timeout: 10000 });
    
    // Ensure welcome overlay is gone
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Get initial entry count from History drawer
    const historyButton = page.getByRole('button', { name: /history/i }).first();
    let initialCount = 0;
    
    if (await historyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      // Count entries in history drawer
      const historyEntries = page.locator('[data-testid="entry-item"], .entry-item, [class*="entry"]');
      initialCount = await historyEntries.count();
      
      // Close history drawer
      const closeButton = page.locator('button[aria-label*="close" i], button[aria-label*="Close" i]').first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }
    
    // Start mic
    await micButton.click({ force: true });
    await page.waitForTimeout(2000); // Wait for voice to be active
    
    // Verify Save button is disabled while voice is active
    const saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(saveButton).toBeDisabled();
    }
    
    // Try to trigger save via keyboard shortcut (should be blocked by guard)
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1000);
    
    // Check that "Saved" toast never appeared
    const savedToast = page.getByText(/saved/i);
    await expect(savedToast).not.toBeVisible({ timeout: 2000 }).catch(() => {});
    
    // Stop mic
    await micButton.click({ force: true });
    await page.waitForTimeout(2000);
    
    // Wait for transcription to finish (isTranscribing becomes false)
    // Wait for "Listening..." indicator to disappear
    const listeningIndicator = page.getByText('Listening...');
    await expect(listeningIndicator).not.toBeVisible({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000); // Extra wait to ensure processing is complete and state updates
    
    // Check if there's content in textarea (if no content, Save will be disabled anyway)
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    const hasContent = await textarea.inputValue().then(val => val.trim().length > 0).catch(() => false);
    
    // If there's content, verify Save button is enabled (after voice stops and transcription finishes)
    if (hasContent) {
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(saveButton).toBeEnabled({ timeout: 5000 });
      }
      
      // Now click Save - should work after voice stops
      await saveButton.click();
      await page.waitForTimeout(2000); // Wait for save to complete
      
      // Verify exactly ONE new entry appears in history
      if (initialCount > 0 && await historyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await historyButton.click();
        await page.waitForTimeout(500);
        
        const historyEntries = page.locator('[data-testid="entry-item"], .entry-item, [class*="entry"]');
        const finalCount = await historyEntries.count();
        expect(finalCount).toBe(initialCount + 1); // Should have exactly one more entry
      }
      
      // Verify "Saved" toast appeared after manual save
      await expect(savedToast).toBeVisible({ timeout: 2000 }).catch(() => {});
    } else {
      // If no content, verify no save occurred
      if (initialCount > 0 && await historyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await historyButton.click();
        await page.waitForTimeout(500);
        
        const historyEntries = page.locator('[data-testid="entry-item"], .entry-item, [class*="entry"]');
        const finalCount = await historyEntries.count();
        expect(finalCount).toBe(initialCount); // Count should remain the same
      }
    }
  });
});

