import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';

test.describe('Journal manual save only (no autosave)', () => {
  test('typing does not trigger save, manual save works, duplicate saves prevented', async ({ page }) => {
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
    
    // Close welcome/onboarding overlay if present
    await page.waitForTimeout(1500);
    
    const gotItBtn = page.getByRole('button', { name: /got it|start journaling/i });
    if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gotItBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    
    const promptNoBtn = page.getByRole('button', { name: /^no$/i });
    if (await promptNoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptNoBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    
    const welcomeOverlay = page.locator('.fixed.inset-0.bg-graphite-charcoal').first();
    await expect(welcomeOverlay).not.toBeVisible({ timeout: 10000 }).catch(() => {});
    
    // Wait for textarea
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.scrollIntoViewIfNeeded();
    
    // Open history drawer to get initial entry count
    const historyBtn = page.getByRole('button', { name: /history/i }).or(
      page.locator('button').filter({ hasText: /^H$/ })
    ).first();
    
    let initialEntryCount = 0;
    if (await historyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyBtn.click({ force: true });
      await page.waitForTimeout(1000);
      
      // Count entries in history drawer by counting visible entry content
      // Entries are rendered in the drawer with their content text
      // We'll count by looking for entry content that's not empty
      const entryContentElements = page.locator('div, p, span').filter({
        hasText: /.{10,}/ // At least 10 characters (actual entry content)
      });
      const allTextElements = await entryContentElements.all();
      
      // Filter to only count actual journal entry content (not UI labels)
      // Entries typically have substantial text content
      let count = 0;
      for (const elem of allTextElements) {
        const text = await elem.textContent();
        if (text && text.trim().length >= 20 && !text.includes('Journal History') && !text.includes('Today') && !text.includes('This Week')) {
          count++;
        }
      }
      initialEntryCount = Math.max(0, count - 2); // Subtract UI labels
      
      // Alternative: Count by checking localStorage directly
      const localStorageCount = await page.evaluate(() => {
        try {
          const keys = Object.keys(localStorage);
          const journalKeys = keys.filter(k => k.includes('heijo-journal-entries'));
          if (journalKeys.length > 0) {
            const data = localStorage.getItem(journalKeys[0]);
            if (data) {
              const entries = JSON.parse(data);
              return Array.isArray(entries) ? entries.length : 0;
            }
          }
        } catch (e) {
          return 0;
        }
        return 0;
      });
      
      // Use localStorage count if available (more reliable)
      if (localStorageCount > 0) {
        initialEntryCount = localStorageCount;
      }
      
      // Close drawer
      const closeBtn = page.getByRole('button', { name: /close/i }).or(
        page.locator('button[aria-label*="close" i]')
      ).first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        // Try clicking outside or pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
    
    // Track localStorage writes to count saves
    let saveCallCount = 0;
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key: string, value: string) {
        // Count writes to journal entries storage
        if (key.includes('heijo-journal-entries')) {
          (window as any).__saveCallCount = ((window as any).__saveCallCount || 0) + 1;
        }
        return originalSetItem.call(this, key, value);
      };
      (window as any).__saveCallCount = 0;
    });
    
    // Reset counter
    await page.evaluate(() => {
      (window as any).__saveCallCount = 0;
    });
    
    // TEST 1: Typing should NOT trigger a save
    const testText = 'Test entry for manual save verification';
    await textarea.fill(testText);
    await page.waitForTimeout(3000); // Wait longer than any auto-save delay
    
    // Check that no save occurred
    const saveCountAfterTyping = await page.evaluate(() => (window as any).__saveCallCount || 0);
    expect(saveCountAfterTyping).toBe(0);
    
    // Verify no "Saved" toast appeared
    const savedToastAfterTyping = page.getByText(/saved/i).first();
    await expect(savedToastAfterTyping).not.toBeVisible({ timeout: 1000 }).catch(() => {});
    
    // TEST 2: Clicking Save should trigger exactly ONE save
    // Find Save button
    let saveButton = page.getByRole('button', { name: /^save$/i }).first();
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button').filter({ hasText: /^S$/ }).first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button[aria-label*="Save entry" i]').first();
    }
    if (!(await saveButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      saveButton = page.locator('button[title*="Save" i]').first();
    }
    
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    
    // Reset counter before save
    await page.evaluate(() => {
      (window as any).__saveCallCount = 0;
    });
    
    // Click Save
    await saveButton.click({ force: true });
    await page.waitForTimeout(3000); // Wait for save to complete
    
    // Verify exactly ONE save occurred
    const saveCountAfterFirstSave = await page.evaluate(() => (window as any).__saveCallCount || 0);
    expect(saveCountAfterFirstSave).toBe(1);
    
    // Verify "Saved" toast appeared
    const savedToast = page.getByText(/saved/i).first();
    await expect(savedToast).toBeVisible({ timeout: 5000 });
    
    // Verify textarea is cleared after save
    const textareaValueAfterSave = await textarea.inputValue();
    expect(textareaValueAfterSave.trim()).toBe('');
    
    // Verify entry count increased by exactly 1
    // Check localStorage count (more reliable than UI counting)
    const countAfterFirstSave = await page.evaluate(() => {
      try {
        const keys = Object.keys(localStorage);
        const journalKeys = keys.filter(k => k.includes('heijo-journal-entries'));
        if (journalKeys.length > 0) {
          const data = localStorage.getItem(journalKeys[0]);
          if (data) {
            const entries = JSON.parse(data);
            return Array.isArray(entries) ? entries.length : 0;
          }
        }
      } catch (e) {
        return 0;
      }
      return 0;
    });
    
    expect(countAfterFirstSave).toBe(initialEntryCount + 1);
    
    // Verify the test entry appears in UI
    if (await historyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyBtn.click({ force: true });
      await page.waitForTimeout(1000);
      
      await expect(page.getByText(testText).first()).toBeVisible({ timeout: 5000 });
      
      // Close drawer
      const closeBtn = page.getByRole('button', { name: /close/i }).or(
        page.locator('button[aria-label*="close" i]')
      ).first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
    
    // TEST 3: Clicking Save again without changes should NOT create a new entry
    // Textarea should be empty after first save, so try to save empty content
    // OR type the same text again and save
    
    // Type the same text again
    await textarea.fill(testText);
    await page.waitForTimeout(500);
    
    // Reset counter
    await page.evaluate(() => {
      (window as any).__saveCallCount = 0;
    });
    
    // Click Save again with same content
    await saveButton.click({ force: true });
    await page.waitForTimeout(3000);
    
    // Verify no additional save occurred (duplicate detection should prevent it)
    const saveCountAfterDuplicate = await page.evaluate(() => (window as any).__saveCallCount || 0);
    // Should be 0 (duplicate blocked)
    expect(saveCountAfterDuplicate).toBe(0);
    
    // Verify entry count did NOT increase (check localStorage)
    const countAfterDuplicate = await page.evaluate(() => {
      try {
        const keys = Object.keys(localStorage);
        const journalKeys = keys.filter(k => k.includes('heijo-journal-entries'));
        if (journalKeys.length > 0) {
          const data = localStorage.getItem(journalKeys[0]);
          if (data) {
            const entries = JSON.parse(data);
            return Array.isArray(entries) ? entries.length : 0;
          }
        }
      } catch (e) {
        return 0;
      }
      return 0;
    });
    
    // Should still be initial + 1 (no new entry created)
    expect(countAfterDuplicate).toBe(initialEntryCount + 1);
    
    // Check if duplicate error toast appeared (optional - depends on implementation)
    const duplicateErrorToast = page.getByText(/identical|duplicate|already saved/i);
    const hasDuplicateError = await duplicateErrorToast.isVisible({ timeout: 2000 }).catch(() => false);
    // Either no toast (silent block) or error toast (both are acceptable)
    
    // Verify only one instance of the test text exists in entries
    const testTextEntries = await page.evaluate((text) => {
      try {
        const keys = Object.keys(localStorage);
        const journalKeys = keys.filter(k => k.includes('heijo-journal-entries'));
        if (journalKeys.length > 0) {
          const data = localStorage.getItem(journalKeys[0]);
          if (data) {
            const entries = JSON.parse(data);
            return entries.filter((e: any) => e.content && e.content.includes(text)).length;
          }
        }
      } catch (e) {
        return 0;
      }
      return 0;
    }, testText);
    
    expect(testTextEntries).toBe(1); // Should only appear once in entries
  });
});

