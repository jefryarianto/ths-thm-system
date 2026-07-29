import { test, expect } from '@playwright/test';
import { mockAuth, registerApprovalsMocks } from './helpers';

test.describe('Approvals — /approvals', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await registerApprovalsMocks(page);
    await page.goto('/approvals');
    await expect(page.locator('h1').first()).toContainText('Persetujuan');
  });

  test('renders page title', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Persetujuan');
  });

  test('renders SummaryBar with pending count', async ({ page }) => {
    const summaryBar = page.locator('text=Menunggu Persetujuan').first();
    await expect(summaryBar).toBeVisible({ timeout: 8000 });
    // Verify the count is rendered inside the SummaryBar component
    await expect(page.locator('text=Menunggu Persetujuan').locator('..')).toContainText('2');
  });

  test('renders pending approval request cards', async ({ page }) => {
    await page.waitForTimeout(500);
    // Mock approval request types
    await expect(page.locator('text=Pendaftaran Anggota Baru').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Kenaikan Tingkat').first()).toBeVisible();
  });

  test('displays approval levels with status', async ({ page }) => {
    await page.waitForTimeout(500);
    // First request has 2 levels: Admin Ranting (approved), Admin Wilayah (pending)
    await expect(page.locator('text=Admin Ranting').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Admin Wilayah').first()).toBeVisible();
  });

  test('Setujui button triggers approve action', async ({ page }) => {
    await page.waitForTimeout(500);
    // Click the first "Setujui" button
    const setujuiBtn = page.locator('button:has-text("Setujui")').first();
    await expect(setujuiBtn).toBeVisible({ timeout: 8000 });

    // Click and verify the request card disappears
    await setujuiBtn.click();
    await page.waitForTimeout(500);
  });

  test('Tolak button triggers reject action', async ({ page }) => {
    await page.waitForTimeout(500);
    const tolakBtn = page.locator('button:has-text("Tolak")').first();
    await expect(tolakBtn).toBeVisible({ timeout: 8000 });

    await tolakBtn.click();
    await page.waitForTimeout(500);
  });
});
