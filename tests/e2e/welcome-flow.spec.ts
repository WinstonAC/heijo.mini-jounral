import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';

test.describe('Welcome flow', () => {
  test.beforeEach(async ({ page }) => {
    // Step 1: Always start from a clean browser state
    await page.goto('about:blank');
    
    // Clear all storage via init script (runs before page loads)
    await page.addInitScript(() => {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear all sessionStorage
      sessionStorage.clear();
      
      // Explicitly clear known onboarding/welcome flags
      const onboardingKeys = [
        'heijo_hasSeenWelcome',
        'heijo_hasSeenOnboarding',
        'has_seen_onboarding',
        'onboarding_completed',
        'welcome_dismissed',
        'intro_completed',
        'tour_completed'
      ];
      
      onboardingKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Also remove any keys containing these patterns
      const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
      allKeys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('welcome') || 
            lowerKey.includes('onboarding') || 
            lowerKey.includes('intro') || 
            lowerKey.includes('tour')) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        }
      });
    });
  });

  test('Welcome flow shows once and persists dismissal', async ({ page }) => {
    // Step 2: Navigate to main entry route
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Sign in
    const emailInput = page.getByPlaceholder('Enter your email');
    const passwordInput = page.getByPlaceholder('Enter your password');
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });
    
    await page.waitForURL(/\/journal/, { timeout: 15000 });
    
    // Wait for page to load
    await expect(page.getByText(/Heijō/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for auth and initial load
    
    // Step 3: Assert welcome UI is visible
    // Look for welcome heading
    const welcomeHeading = page.getByRole('heading', { name: /welcome|get started|hey|intro/i }).first();
    
    // Welcome overlay is a div that replaces the textarea, not a dialog
    // Check for welcome heading and content
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
    
    // Verify welcome content
    await expect(page.getByText(/Welcome to Heijō/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Micro-moments. Macro-clarity./i)).toBeVisible({ timeout: 5000 });
    
    // Verify textarea is NOT visible yet (welcome overlay is showing instead)
    const textarea = page.getByPlaceholder('Type or speak your thoughts...');
    const textareaVisible = await textarea.isVisible({ timeout: 1000 }).catch(() => false);
    expect(textareaVisible).toBe(false);
    
    // Step 4: Dismiss the welcome flow
    // Find primary CTA button
    let dismissButton = page.getByRole('button', { name: /get started|continue|next|done|start/i }).first();
    
    // If not found, try alternative selectors
    if (!(await dismissButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      dismissButton = page.getByRole('button', { name: /Start journaling/i }).first();
    }
    
    await expect(dismissButton).toBeVisible({ timeout: 5000 });
    
    // Click through welcome flow (handle multiple steps if present)
    let clickCount = 0;
    const maxClicks = 5;
    
    while (clickCount < maxClicks) {
      // Check if welcome is still visible
      const stillVisible = await welcomeHeading.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (!stillVisible) {
        break; // Welcome is dismissed
      }
      
      // Find the current CTA button
      let currentButton = page.getByRole('button', { name: /get started|continue|next|done|start|start journaling/i }).first();
      
      if (!(await currentButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Try alternative button text
        currentButton = page.getByRole('button', { name: /Start journaling/i }).first();
      }
      
      if (await currentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await currentButton.click({ force: true });
        await page.waitForTimeout(1000); // Wait for transition
        clickCount++;
      } else {
        break; // No more buttons to click
      }
    }
    
    // Step 5: Assert welcome UI is gone and main journal UI is ready
    // Welcome should be gone
    await expect(welcomeHeading).not.toBeVisible({ timeout: 5000 });
    
    // Editor textarea should now be visible and enabled
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.scrollIntoViewIfNeeded();
    
    // Verify textarea is enabled
    const isDisabled = await textarea.isDisabled().catch(() => true);
    expect(isDisabled).toBe(false);
    
    // Click into editor and type to confirm usability
    await textarea.focus();
    const isFocused = await textarea.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(true);
    
    await textarea.fill('test');
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toBe('test');
    
    // Step 6: Reload the page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for welcome check to complete
    
    // Step 7: Assert welcome UI does NOT show again
    // Welcome heading should NOT be visible
    const welcomeHeadingAfterReload = page.getByRole('heading', { name: /welcome|get started|hey|intro/i }).first();
    await expect(welcomeHeadingAfterReload).not.toBeVisible({ timeout: 5000 });
    
    // Editor should still be visible (no welcome blocking it)
    const textareaAfterReload = page.getByPlaceholder('Type or speak your thoughts...');
    await expect(textareaAfterReload).toBeVisible({ timeout: 10000 });
    
    // Verify localStorage flag was persisted
    const hasSeenWelcomeFlag = await page.evaluate(() => {
      return localStorage.getItem('heijo_hasSeenWelcome') === 'true';
    });
    expect(hasSeenWelcomeFlag).toBe(true);
  });
});
