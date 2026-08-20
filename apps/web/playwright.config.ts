import { defineConfig, devices } from '@playwright/test';

/**
 * Use blob reporter in CI for shard-compatible reporting,
 * fall back to html reporter locally for interactive viewing.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  reporter: isCI ? [['blob', { outputDir: './blob-report' }]] : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    headless: true,
    // Auto-update missing snapshot baselines — new baselines are created on
    // first run and compared on subsequent runs.
    toHaveScreenshot: {
      updateSnapshots: process.env.CI ? 'missing' : 'off',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
