import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  globalSetup: require.resolve('./tests/global-setup.ts'),
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { 
      name: 'chromium', 
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/state.json',
      },
      workers: 1, // Run serially to avoid auth conflicts
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});


