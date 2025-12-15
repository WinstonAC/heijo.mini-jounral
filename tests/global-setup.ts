import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const TEST_EMAIL = process.env.TEST_EMAIL || 'testrunner+01@heijo.io';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Heijo-Test-2025!';
const baseURL = process.env.BASE_URL || 'http://localhost:3000';

async function globalSetup(config: FullConfig) {
  const storageStatePath = path.join(__dirname, '../playwright/.auth/state.json');
  
  // Ensure directory exists
  const storageStateDir = path.dirname(storageStatePath);
  if (!fs.existsSync(storageStateDir)) {
    fs.mkdirSync(storageStateDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');

    // Wait for login form
    await page.waitForSelector('input[placeholder*="email" i]', { timeout: 10000 });

    // Fill in credentials
    const emailInput = page.getByPlaceholder('Enter your email');
    const passwordInput = page.getByPlaceholder('Enter your password');
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Wait for button to be enabled and click sign in
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });

    // Wait for navigation to journal page
    await page.waitForURL(/\/journal/, { timeout: 15000 });

    // Wait for stable journal page marker (Heijō header)
    await page.waitForSelector('text=/Heijō/i', { timeout: 15000 });

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Save storage state (cookies, localStorage, sessionStorage)
    await context.storageState({ path: storageStatePath });
    
    console.log('✅ Authentication successful, storage state saved to:', storageStatePath);
  } catch (error) {
    console.error('❌ Global setup authentication failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

