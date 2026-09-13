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
  // CI: 2x retry untuk ketahanan terhadap flake cold-start di runner lambat;
  // trace terkumpul otomatis pada retry pertama (lihat `trace` di bawah).
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['blob', { outputDir: './blob-report' }]] : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    headless: true,
  },
  // Start the Next.js server automatically before tests and stop it after.
  // This ensures tests have a running server without manual setup.
  webServer: isCI
    ? {
        // CI: server produksi (`next start` setelah `next build`) — tanpa
        // kompilasi per-halaman ala dev yang menyebabkan flake timeout
        // di runner CI yang lebih lambat.
        command: 'npx next start -p 3002',
        url: 'http://localhost:3002/login',
        reuseExistingServer: false,
        timeout: 120 * 1000,
      }
    : {
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
