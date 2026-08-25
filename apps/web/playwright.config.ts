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
  },
  // Start the Next.js dev server automatically before tests and stop it after.
  // This ensures tests have a running server without manual setup.
  webServer: {
    command: 'npx next dev -p 3002',
    url: 'http://localhost:3002/login',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
