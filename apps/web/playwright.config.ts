import { defineConfig, devices } from '@playwright/test';

/**
 * Use blob reporter in CI for shard-compatible reporting,
 * fall back to html reporter locally for interactive viewing.
 */
const isCI = !!process.env.CI;

// Port webServer E2E bisa dioverride (E2E_PORT) agar run lokal terisolasi
// dari dev server yang mungkin sedang berjalan di 3002.
const E2E_PORT = process.env.E2E_PORT || '3002';
const E2E_LOCAL_BASE = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  // CI: 2x retry untuk ketahanan terhadap flake cold-start di runner lambat;
  // trace terkumpul otomatis pada retry pertama (lihat `trace` di bawah).
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['blob', { outputDir: './blob-report' }]] : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || E2E_LOCAL_BASE,
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
        command: `npx next start -p ${E2E_PORT}`,
        url: `${E2E_LOCAL_BASE}/login`,
        reuseExistingServer: false,
        timeout: 120 * 1000,
        // proxy.ts memverifikasi sesi ke NEXT_PUBLIC_API_URL saat runtime.
        // E2E full-mock (tanpa backend): arahkan ke port mati agar verify
        // selalu network-error → fail-open (desain proxy), DETERMINISTIK.
        // Tanpa ini, API dev lokal yang kebetulan jalan di :3001 membalas
        // 401 untuk token mock → kick setiap soft-navigasi (artefak lokal).
        env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:59999' },
      }
    : {
        command: `npx next dev -p ${E2E_PORT}`,
        url: `${E2E_LOCAL_BASE}/login`,
        reuseExistingServer: true,
        timeout: 30000,
        env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:59999' },
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
