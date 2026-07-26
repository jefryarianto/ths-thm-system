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
    await expect(page.getByText('THS-THM')).toBeVisible();

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
    await expect(page.getByText('THS-THM')).not.toBeVisible();

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
    await expect(page.getByText('THS-THM')).not.toBeVisible();
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
    await expect(page.getByText('THS-THM')).toBeVisible();
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
    await expect(page.getByText('THS-THM')).toBeVisible();

    // Resize to tablet width (< 1024px)
    await page.setViewportSize({ width: 800, height: 800 });

    // Sidebar should auto-collapse — THS-THM text hidden
    await expect(page.getByText('THS-THM')).not.toBeVisible();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();
  });

  test('restores desktop preference when resizing back above 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Collapse on desktop
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();

    // Resize to tablet
    await page.setViewportSize({ width: 800, height: 800 });
    await expect(page.getByText('THS-THM')).not.toBeVisible();

    // Resize back to desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // Should restore the collapsed preference (we collapsed it before)
    await expect(page.getByText('THS-THM')).not.toBeVisible();
    await expect(page.locator('button[aria-label="Perluas sidebar"]')).toBeVisible();
  });

  test('profile dropdown opens and closes correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Find profile trigger button inside the sidebar
    const profileTrigger = page.locator('aside').locator('button').filter({ has: page.locator('text=Super Admin') });
    await expect(profileTrigger).toBeVisible();

    // Click on the profile area to open dropdown
    await profileTrigger.click();

    // Dropdown should appear with menu items
    await expect(page.getByText('Profil Saya')).toBeVisible();
    await expect(page.getByText('Ubah Password')).toBeVisible();
    await expect(page.getByText('Keluar')).toBeVisible();

    // Click outside to close — click on the main content area
    await page.locator('header h2').click();
    await expect(page.getByText('Profil Saya')).not.toBeVisible();
  });

  test('profile dropdown items navigate correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Open profile dropdown
    const profileTrigger = page.locator('button').filter({ has: page.locator('text=Super Admin') });
    await profileTrigger.click();

    // Click "Profil Saya" — should navigate to /settings
    await page.getByText('Profil Saya').click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('nav item labels are hidden when collapsed (spans with truncate)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Expanded: nav items show labels
    const anggotaLabel = page.getByText('Anggota');
    await expect(anggotaLabel).toBeVisible();

    // Collapse
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();

    // Labels (spans inside nav links) should be hidden
    // The spans with truncate class are only rendered when not collapsed
    await expect(anggotaLabel).not.toBeVisible();
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

  test('user avatar shows only initials when collapsed (expanded shows name)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Scope to sidebar's profile trigger button only (header also has the name)
    const profileSection = page.locator('aside').locator('button').filter({ has: page.locator('text=Super Admin') });

    // Expanded: user name is visible inside the sidebar profile button
    // The div with min-w-0 truncate contains the name text
    const nameEl = profileSection.locator('p').first();
    const emailEl = profileSection.locator('p').nth(1);
    await expect(nameEl).toBeVisible();
    await expect(emailEl).toBeVisible();

    // Collapse
    await page.locator('button[aria-label="Ciutkan sidebar"]').click();

    // Name and email paragraphs are conditionally rendered — no longer in DOM
    await expect(nameEl).not.toBeVisible();
    await expect(emailEl).not.toBeVisible();
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

    // Find profile trigger (just the avatar centered)
    const sidebar = page.locator('aside');
    const profileTrigger = sidebar.locator('button[title="Super Admin"]');
    await expect(profileTrigger).toBeVisible();

    // Click to open dropdown
    await profileTrigger.click();

    // Collapsed dropdown should appear with user info header + menu items
    await expect(page.getByText('Super Admin').first()).toBeVisible();
    await expect(page.getByText('superadmin@ths-thm.org').first()).toBeVisible();
    await expect(page.getByText('Profil Saya')).toBeVisible();
    await expect(page.getByText('Ubah Password')).toBeVisible();
    await expect(page.getByText('Keluar')).toBeVisible();

    // Click outside to close dropdown
    await page.locator('header h2').click();
    await expect(page.getByText('Profil Saya')).not.toBeVisible();
  });
});
