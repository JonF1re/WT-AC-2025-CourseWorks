import { defineConfig, devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Runs against local dev server (web + server)
 * Uses Chromium for consistent testing
 */
const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  
  /* Global setup - runs once before all tests */
  globalSetup: './tests/e2e/global-setup.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'on-first-retry',
    
    /* Timeout for each action */
    actionTimeout: 10000,
    
    /* Timeout for navigation */
    navigationTimeout: 30000,
  },
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  /* Global timeout for each test */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
  
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'pnpm --filter @app/server dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000,
      cwd: '../..',
      env: {
        NODE_ENV: 'test',
      },
    },
    {
      command: 'pnpm dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
  
  /* Output folder for test artifacts (screenshots, videos, etc) */
  outputDir: 'test-results',
};

export default defineConfig(config);
