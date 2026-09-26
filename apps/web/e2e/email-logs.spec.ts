import { test, expect, type Page } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Verifikasi halaman Riwayat Email (/settings/email/logs):
 * - Tabel log + kartu statistik render dengan data mock
 * - Klik baris membuka modal detail (isi email dalam iframe sandbox)
 * - Link sidebar "Riwayat Email" dan quick actions dashboard mengarah ke halaman
 *
 * API mocks meng-override catch-all /api/** dari mockAuth (last-registered wins).
 */

const MOCK_LOG = {
  id: 'log-1',
  to: 'anggota@example.com',
  subject: 'Selamat Datang di THS-THM',
  status: 'sent',
  provider: 'resend',
  error: null,
  content:
    '<div style="font-family:sans-serif;padding:16px"><h2 style="color:#1a56db">Halo Anggota</h2><p>Ini isi email percobaan untuk verifikasi modal detail.</p></div>',
  metadata: { module: 'notifications', template: 'generalNotificationEmail' },
  createdAt: '2026-09-17T08:30:00.000Z',
};

const MOCK_LOG_FAILED = {
  id: 'log-2',
  to: 'admin@example.com',
  subject: 'Status Klaim Diperbarui',
  status: 'failed',
  provider: null,
  error: 'All email providers failed (Resend + SMTP)',
  content: null,
  metadata: { module: 'claims' },
  createdAt: '2026-09-16T14:00:00.000Z',
};

async function registerMailMocks(page: Page) {
  // GET /api/mail/logs — daftar log (dengan content untuk modal detail).
  // Anchor agar tidak menangkap /api/mail/logs/stats & /engagement.
  await page.route(/\/api\/mail\/logs(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [MOCK_LOG, MOCK_LOG_FAILED],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      }),
    });
  });

  // GET /api/mail/logs/stats
  await page.route(/\/api\/mail\/logs\/stats(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total: 2,
          sent: 1,
          failed: 1,
          skipped: 0,
          successRate: 50,
          dailyStats: [],
          topRecipients: [{ email: 'anggota@example.com', count: 1 }],
        },
      }),
    });
  });

  // GET /api/mail/modules
  await page.route(/\/api\/mail\/modules(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { module: 'notifications', count: 1 },
          { module: 'claims', count: 1 },
        ],
      }),
    });
  });
}

test.describe('Riwayat Email — /settings/email/logs', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await registerMailMocks(page);
  });

  test('renders page header and stats cards', async ({ page }) => {
    await page.goto('/settings/email/logs');
    await expect(page.locator('h1')).toContainText('Riwayat Email');
    await expect(page.getByText('Terkirim').first()).toBeVisible();
    await expect(page.getByText('Gagal').first()).toBeVisible();
  });

  test('renders email log rows from API', async ({ page }) => {
    await page.goto('/settings/email/logs');
    const table = page.getByRole('table');
    await expect(table.getByText('anggota@example.com')).toBeVisible();
    await expect(table.getByText('Selamat Datang di THS-THM')).toBeVisible();
    await expect(table.getByText('admin@example.com')).toBeVisible();
  });

  test('opens detail modal with email content when row is clicked', async ({ page }) => {
    await page.goto('/settings/email/logs');
    await page.getByText('Selamat Datang di THS-THM').click();

    // Modal muncul dengan meta lengkap
    const modal = page.locator('div.fixed.z-50');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('anggota@example.com')).toBeVisible();

    // Isi email dirender dalam iframe sandbox
    const frame = page.locator('iframe[title="Isi email"]');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('srcdoc', /Halo Anggota/);
  });

  test('modal shows fallback and error for failed log without content', async ({ page }) => {
    await page.goto('/settings/email/logs');
    await page.getByText('Status Klaim Diperbarui').click();

    const modal = page.locator('div.fixed.z-50');
    await expect(modal).toBeVisible();
    await expect(
      modal.getByText('Konten email tidak tersedia untuk log ini.'),
    ).toBeVisible();
    await expect(modal.getByText('All email providers failed')).toBeVisible();
  });

  test('modal closes on Escape', async ({ page }) => {
    await page.goto('/settings/email/logs');
    await page.getByText('Selamat Datang di THS-THM').click();
    const frame = page.locator('iframe[title="Isi email"]');
    await expect(frame).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(frame).toBeHidden();
  });

  test('sidebar link navigates to /settings/email/logs', async ({ page }) => {
    await page.goto('/dashboard');

    // Grup "Pengaturan" default collapsed — expand dulu agar link terlihat
    // (grup lama bernama "Sistem", diganti saat restrukturisasi navigasi).
    const pengaturanGroup = page.getByRole('button', { name: 'Pengaturan', exact: true }).first();
    await pengaturanGroup.click();

    const sidebarLink = page.locator('a[href="/settings/email/logs"]').first();
    await expect(sidebarLink).toBeVisible();
    // referrerPolicy NO REFERRER: request RSC klik link tidak membawa referer
    // yang membuat proxy salah menganggap navigasi lintas situs → kick ke /login.
    // force:true melewati cek "stable" — transisi CSS group sidebar membuat
    // elemen flaky "not stable" saat baru di-expand.
    await sidebarLink.click({ referrerPolicy: 'no-referrer', force: true });
    await expect(page).toHaveURL(/\/settings\/email\/logs/);
    await expect(page.locator('h1')).toContainText('Riwayat Email');
  });
});
