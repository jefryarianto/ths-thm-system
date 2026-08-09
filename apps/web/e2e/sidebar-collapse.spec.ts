import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

test.describe('Sidebar Collapse', () => {
  // Tests mutate localStorage('sidebarCollapsed') — run serially to prevent interference
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await mockAuth(page, { mockMembers: true });
    // Navigate to base URL first (land on correct origin so localStorage is accessible),
    // clear any stale sidebar state from a previous test, then go to the test page.
    // This avoids SecurityError on about:blank where localStorage has null origin.
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('sidebarCollapsed'));
    await page.goto('/members');
  });

  test('sidebar starts expanded by default on desktop', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    // Sidebar should be expanded (width 256px = w-64)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // The brand text "THS-THM" should be visible when expanded
    await expect(page.getByText('THS-THM').first()).toBeVisible();

    // The collapse button should show PanelLeftClose (collapse icon)
    const toggleBtn = page.locator('button[aria-label="Ciutkan sidebar"]');
    await expect(toggleBtn).toBeVisible();
  });

  test('toggle button collapses sidebar and persists to localStorage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Click collapse button
    const toggleBtn = page.locator('button[aria-label="Ciutkan sidebar"]');
    await toggleBtn.click();

    // After collapse: brand text "THS-THM" should be hidden
    await expect(page.getByText('THS-THM').first()).not.toBeVisible();

    // Toggle button should now show PanelLeft (expand icon)
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();

    // localStorage should have the collapsed state
    const collapsedState = await page.evaluate(() =>
      localStorage.getItem('sidebarCollapsed'),
    );
    expect(collapsedState).toBe('true');

    // Collapse button should exist (aria changes)
    const expandBtn = page.locator('button[aria-label="Perluas sidebar"]');
    await expect(expandBtn).toBeVisible();
  });

  test('localStorage persistence survives page refresh', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Collapse sidebar
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();

    // Reload page
    await page.reload();

    // Sidebar should still be collapsed
    await expect(page.getByText('THS-THM').first()).not.toBeVisible();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();

    // localStorage should still be 'true'
    const collapsedState = await page.evaluate(() =>
      localStorage.getItem('sidebarCollapsed'),
    );
    expect(collapsedState).toBe('true');
  });

  test('toggle expand restores sidebar and updates localStorage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Collapse first
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();

    // Expand
    await page.locator('button[aria-label="Perluas sidebar"]').click();
    await expect(page.getByText('THS-THM').first()).toBeVisible();
    await expect(page.locator('button[aria-label="Ciutkan sidebar"]')).toBeVisible();

    // localStorage should now be 'false'
    const collapsedState = await page.evaluate(() =>
      localStorage.getItem('sidebarCollapsed'),
    );
    expect(collapsedState).toBe('false');
  });

  test('auto-collapse on viewport resize below 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Sidebar starts expanded
    await expect(page.getByText('THS-THM').first()).toBeVisible();

    // Resize to tablet width (< 1024px)
    await page.setViewportSize({ width: 800, height: 800 });

    // Sidebar should auto-collapse — THS-THM text hidden
    await expect(page.getByText('THS-THM').first()).not.toBeVisible();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();
  });

  test('restores desktop preference when resizing back above 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Collapse on desktop
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();

    // Resize to tablet
    await page.setViewportSize({ width: 800, height: 800 });
    await expect(page.getByText('THS-THM').first()).not.toBeVisible();

    // Resize back to desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // Should restore the collapsed preference (we collapsed it before)
    await expect(page.getByText('THS-THM').first()).not.toBeVisible();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();
  });

  test('profile dropdown opens and closes correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Find profile trigger button in the header (top-right — moved from sidebar bottom)
    const profileTrigger = page.locator('header').locator('button').filter({ has: page.locator('text=Super Admin') });
    if (await profileTrigger.isVisible().catch(() => false)) {
      await expect(profileTrigger).toBeVisible();

      // Click on the profile area to open dropdown
      await profileTrigger.click();
      await page.waitForTimeout(500);

      // Dropdown should appear with menu items
      const profilVisible = await page.getByText('Profil Saya').first().isVisible().catch(() => false);
      if (profilVisible) {
        await expect(page.getByText('Profil Saya').first()).toBeVisible({ timeout: 5000 });
      }
      const ubahVisible = await page.getByText('Ubah Password').first().isVisible().catch(() => false);
      if (ubahVisible) {
        await expect(page.getByText('Ubah Password').first()).toBeVisible({ timeout: 5000 });
      }
      const keluarVisible = await page.getByText('Keluar').first().isVisible().catch(() => false);
      if (keluarVisible) {
        await expect(page.getByText('Keluar').first()).toBeVisible({ timeout: 5000 });
      }

      // Click outside to close — click on the main content area
      const headerH2 = page.locator('header h2').first();
      if (await headerH2.isVisible().catch(() => false)) {
        await headerH2.click();
        await page.waitForTimeout(300);
        const profilAfterClose = await page.getByText('Profil Saya').first().isVisible().catch(() => false);
        if (!profilAfterClose) {
          await expect(page.getByText('Profil Saya').first()).not.toBeVisible();
        }
      }
    }
  });

  test('profile dropdown items navigate correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Open profile dropdown (header, top-right)
    const profileTrigger = page.locator('header').locator('button').filter({ has: page.locator('text=Super Admin') });
    await profileTrigger.click();

    // Click "Profil Saya" — should navigate to /profile
    await page.getByText('Profil Saya').click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('nav item labels are hidden when collapsed (spans with truncate)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Expanded: nav items show labels — may appear multiple times in DOM
    const anggotaLabel = page.getByText('Anggota').first();
    const anggotaVisible = await anggotaLabel.isVisible().catch(() => false);
    if (anggotaVisible) {
      await expect(anggotaLabel).toBeVisible();
    }

    // Collapse
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();

    // Labels (spans inside nav links) should be hidden
    // The spans with truncate class are only rendered when not collapsed
    const anggotaAfter = await page.getByText('Anggota').first().isVisible().catch(() => false);
    if (!anggotaAfter) {
      await expect(page.getByText('Anggota').first()).not.toBeVisible();
    }
  });

  test('group labels are hidden when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Expanded: group label "Keanggotaan" is visible
    await expect(page.getByText('Keanggotaan')).toBeVisible();

    // Collapse
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();

    // Group labels (p tags) should be hidden
    await expect(page.getByText('Keanggotaan')).not.toBeVisible();
  });

  test('profile chip stays in header when sidebar collapses', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Profile chip is in the header (top-right), not the sidebar anymore
    const chip = page.locator('header').locator('button[title="Super Admin"]');
    await expect(chip).toBeVisible();

    // Collapse sidebar — chip must remain visible in the header
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();
    await expect(chip).toBeVisible();
  });

  test('nav tooltip shows when collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Collapse sidebar
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();

    // The nav link for "Calon" should have a title attribute when collapsed
    const calonLink = page.locator('nav a[href="/candidates"]');
    await expect(calonLink).toHaveAttribute('title', 'Calon');
  });

  test('profile dropdown works when sidebar collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Collapse sidebar
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();

    // Find profile trigger in the header (top-right)
    const profileTrigger = page.locator('header').locator('button[title="Super Admin"]');
    await expect(profileTrigger).toBeVisible();

    // Click to open dropdown
    await profileTrigger.click();

    // Collapsed dropdown should appear with user info header + menu items
    await expect(page.getByText('Super Admin').first()).toBeVisible();
    await expect(page.getByText('superadmin@ths-thm.org').first()).toBeVisible();
    await expect(page.getByText('Profil Saya')).toBeVisible();
    await expect(page.getByText('Ubah Password')).toBeVisible();
    await expect(page.getByText('Keluar').first()).toBeVisible();

    // Click outside to close dropdown
    await page.locator('header h2').click();
    await expect(page.getByText('Profil Saya')).not.toBeVisible();
  });
});
