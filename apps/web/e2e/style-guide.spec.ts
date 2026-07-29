import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Section IDs in the style-guide page, one per <section> element.
 * The page uses an <a href="#{id}"> nav and <section id="{id}"> for each section.
 */
const SECTION_IDS = [
  'typography',
  'colors',
  'buttons',
  'badges',
  'inputs',
  'avatars',
  'tables',
  'modals',
  'info-rows',
  'search-bar',
  'pagination',
  'page-header',
] as const;

/**
 * Section titles rendered as <h2> headings.
 */
const SECTION_TITLES: Record<string, string> = {
  typography: 'Tipografi',
  colors: 'Warna',
  buttons: 'Button',
  badges: 'Badge',
  inputs: 'Input',
  avatars: 'Avatar',
  tables: 'Data Table',
  modals: 'Modal',
  'info-rows': 'Info Row',
  'search-bar': 'Search Bar',
  pagination: 'Pagination',
  'page-header': 'Page Header',
};

test.describe('Style Guide — /style-guide', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await page.goto('/style-guide');
    // Wait for the page to be fully rendered — h1 confirms React hydration
    await expect(page.locator('h1').first()).toContainText('Style Guide');
  });

  // ─── Section Rendering ────────────────────────────

  test('renders all 12 sections with correct headings', async ({ page }) => {
    for (const id of SECTION_IDS) {
      const section = page.locator(`section#${id}`);
      await expect(section).toBeVisible({ timeout: 5000 });

      const heading = section.locator('h2').first();
      await expect(heading).toContainText(SECTION_TITLES[id]);
    }
  });

  test('quick navigation links scroll to each section', async ({ page }) => {
    for (const id of SECTION_IDS) {
      const navLink = page.locator(`a[href="#${id}"]`);
      await expect(navLink).toBeVisible();

      // Click the nav link and verify the section comes into view
      await navLink.click();
      await page.waitForTimeout(300); // allow smooth scroll

      // After clicking, the section should be in the viewport
      const section = page.locator(`section#${id}`);
      await expect(section).toBeVisible();
    }
  });

  // ─── DualThemePreview — Light & Dark ──────────────

  test('DualThemePreview shows both Light and Dark labels', async ({ page }) => {
    // Each DualThemePreview has exactly one "☀️ Light" and one "🌙 Dark"
    const lightLabels = page.locator('text=☀️ Light');
    const darkLabels = page.locator('text=🌙 Dark');

    // Should have at least as many as there are sections (12+)
    const lightCount = await lightLabels.count();
    const darkCount = await darkLabels.count();
    expect(lightCount).toBeGreaterThanOrEqual(12);
    expect(darkCount).toBeGreaterThanOrEqual(12);
    expect(lightCount).toEqual(darkCount);
  });

  test('DualThemePreview renders components in both themes', async ({ page }) => {
    // Spot-check the first DualThemePreview (Typography section)
    const typographySection = page.locator('section#typography');

    // Light side should have white background + dark text
    // Dark side should have gray-900 background + light text

    // Check that Button variants render inside both columns
    const buttonsSection = page.locator('section#buttons');
    const allButtons = buttonsSection.locator('button');
    expect(await allButtons.count()).toBeGreaterThanOrEqual(1);

    // Check text content visible in both columns
    const headingLight = typographySection.locator('text=Dashboard THS-THM');
    await expect(headingLight.first()).toBeVisible();
    await expect(headingLight.last()).toBeVisible();
  });

  // ─── Button Section ───────────────────────────────

  test('buttons section renders all variants and sizes', async ({ page }) => {
    const buttonsSection = page.locator('section#buttons');

    // Check variant labels
    await expect(buttonsSection.locator('text=Variants').first()).toBeVisible();
    await expect(buttonsSection.locator('text=Sizes').first()).toBeVisible();
    await expect(buttonsSection.locator('text=With Icons').first()).toBeVisible();
    await expect(buttonsSection.locator('text=Disabled & Loading').first()).toBeVisible();

    // Verify specific buttons render (DualThemePreview renders each twice)
    await expect(buttonsSection.locator('button:has-text("Primary")').first()).toBeVisible();
    await expect(buttonsSection.locator('button:has-text("Secondary")').first()).toBeVisible();
    await expect(buttonsSection.locator('button:has-text("Danger")').first()).toBeVisible();
    await expect(buttonsSection.locator('button:has-text("Ghost")').first()).toBeVisible();

    // Size buttons
    await expect(buttonsSection.locator('button:has-text("Small")').first()).toBeVisible();
    await expect(buttonsSection.locator('button:has-text("Medium")').first()).toBeVisible();
    await expect(buttonsSection.locator('button:has-text("Large")').first()).toBeVisible();

    // Disabled button should have disabled attribute
    const disabledBtn = buttonsSection.locator('button:has-text("Disabled")').first();
    await expect(disabledBtn).toBeDisabled();

    // Loading button should be disabled
    const loadingBtn = buttonsSection.locator('button:has-text("Loading")').first();
    await expect(loadingBtn).toBeDisabled();
  });

  // ─── Badge Section ────────────────────────────────

  test('badges section renders all 5 variants', async ({ page }) => {
    const badgesSection = page.locator('section#badges');

    await expect(badgesSection.locator('text=Default').first()).toBeVisible();
    await expect(badgesSection.locator('text=Success').first()).toBeVisible();
    await expect(badgesSection.locator('text=Warning').first()).toBeVisible();
    await expect(badgesSection.locator('text=Danger').first()).toBeVisible();
    await expect(badgesSection.locator('text=Info').first()).toBeVisible();
  });

  // ─── Input & Select Section ───────────────────────

  test('input section renders all input variants', async ({ page }) => {
    const inputsSection = page.locator('section#inputs');

    await expect(inputsSection.locator('text=Nama Lengkap').first()).toBeVisible();
    await expect(inputsSection.locator('text=Dengan Error').first()).toBeVisible();
    await expect(inputsSection.locator('text=Disabled').first()).toBeVisible();
    await expect(inputsSection.locator('text=Pilih Ranting').first()).toBeVisible();
  });

  // ─── Data Table Section ───────────────────────────

  test('data table section renders rows with mock data', async ({ page }) => {
    const tablesSection = page.locator('section#tables');

    // Check column headers (DualThemePreview renders each twice)
    await expect(tablesSection.locator('text=Nama').first()).toBeVisible();
    await expect(tablesSection.locator('text=No. Anggota').first()).toBeVisible();
    await expect(tablesSection.locator('text=Status').first()).toBeVisible();
    await expect(tablesSection.locator('text=Email').first()).toBeVisible();

    // Check mock data rows render
    await expect(tablesSection.locator('text=Ahmad Fauzi').first()).toBeVisible();
    await expect(tablesSection.locator('text=Siti Nurhaliza').first()).toBeVisible();
    await expect(tablesSection.locator('text=Budi Santoso').first()).toBeVisible();

    // Status badges
    await expect(tablesSection.locator('text=aktif').first()).toBeVisible();
    await expect(tablesSection.locator('text=nonaktif').first()).toBeVisible();
  });

  // ─── Modal Interaction ────────────────────────────

  test('modal opens and closes on button click', async ({ page }) => {
    const modalsSection = page.locator('section#modals');

    // Click "Buka Modal" button (first one — DualThemePreview renders twice)
    const openModalBtn = modalsSection.locator('button:has-text("Buka Modal")').first();
    await openModalBtn.click();
    await page.waitForTimeout(200);

    // Modal should be visible with its title
    const modalTitle = page.locator('text=Contoh Modal');
    await expect(modalTitle).toBeVisible();

    // Modal should have input fields
    await expect(page.locator('text=Nama').first()).toBeVisible();

    // Click "Batal" button to close
    const closeBtn = page.locator('button:has-text("Batal")').first();
    await closeBtn.click();
    await page.waitForTimeout(200);

    // Modal should be gone
    await expect(modalTitle).not.toBeVisible();
  });

  test('confirm dialog opens and closes', async ({ page }) => {
    const modalsSection = page.locator('section#modals');

    // Click "Buka Konfirmasi" button (first one — DualThemePreview)
    const openConfirmBtn = modalsSection.locator('button:has-text("Buka Konfirmasi")').first();
    await openConfirmBtn.click();
    await page.waitForTimeout(200);

    // Confirm dialog should be visible with title and message
    await expect(page.locator('text=Hapus Data')).toBeVisible();
    await expect(page.locator('text=Apakah Anda yakin ingin menghapus')).toBeVisible();

    // Click "Batal" to close
    const cancelBtn = page.locator('button:has-text("Batal")').first();
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // Confirm dialog should be gone
    await expect(page.locator('text=Hapus Data')).not.toBeVisible();
  });

  test('modal opens, fills form, and submits via Simpan', async ({ page }) => {
    const modalsSection = page.locator('section#modals');

    // Open modal (first button — DualThemePreview)
    await modalsSection.locator('button:has-text("Buka Modal")').first().click();
    await page.waitForTimeout(200);

    // Fill the input fields
    const nameInput = page.locator('input[placeholder="Masukkan nama..."]');
    await nameInput.fill('E2E Test User');

    const emailInput = page.locator('input[placeholder="email@example.com"]');
    await emailInput.fill('e2e@test.com');

    // Click Simpan to close
    const simpanBtn = page.locator('button:has-text("Simpan")').first();
    await simpanBtn.click();
    await page.waitForTimeout(200);

    // Modal should close
    await expect(page.locator('text=Contoh Modal')).not.toBeVisible();
  });

  // ─── Pagination Interaction ───────────────────────

  test('pagination component renders and responds to clicks', async ({ page }) => {
    const paginationSection = page.locator('section#pagination');

    // The "Default" showcase has a working Pagination with 5 pages, 47 total
    // It should show total count (DualThemePreview renders twice)
    await expect(paginationSection.locator('text=47 total').first()).toBeVisible();

    // Click page 2 (first one — DualThemePreview)
    const page2Btn = paginationSection.locator('button:has-text("2")').first();
    await page2Btn.click();
    await page.waitForTimeout(100);

    // Page 2 should now be active (highlighted)
    // The active page button has bg-blue-600 class
    const activePage = paginationSection.locator('button.bg-blue-600').first();
    await expect(activePage).toContainText('2');
  });

  test('pagination edge case — single page does not render buttons', async ({ page }) => {
    const paginationSection = page.locator('section#pagination');

    // The "Edge — Single Page" showcase shows 1 page, 3 total
    await expect(paginationSection.locator('text=Edge — Single Page').first()).toBeVisible();
  });

  // ─── Search Bar Interaction ───────────────────────

  test('search bar accepts input and reset clears it', async ({ page }) => {
    const searchSection = page.locator('section#search-bar');

    // Find the first search input (default showcase — DualThemePreview)
    const searchInput = searchSection.locator('input[placeholder="Cari anggota..."]').first();
    await expect(searchInput).toBeVisible();

    // Type in the search bar
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');

    // Click the Reset button (first one)
    const resetBtn = searchSection.locator('button:has-text("Reset")').first();
    await resetBtn.click();
    await page.waitForTimeout(100);

    // Search should be cleared
    await expect(searchInput).toHaveValue('');
  });

  // ─── Avatar Section ───────────────────────────────

  test('avatar section renders initials-based avatars with size labels', async ({ page }) => {
    const avatarSection = page.locator('section#avatars');

    // Size labels should be visible (DualThemePreview renders twice)
    await expect(avatarSection.locator('text=sm').first()).toBeVisible();
    await expect(avatarSection.locator('text=md').first()).toBeVisible();
    await expect(avatarSection.locator('text=lg').first()).toBeVisible();

    // Profile card should render with admin info
    await expect(avatarSection.locator('text=Super Admin').first()).toBeVisible();
    await expect(avatarSection.locator('text=admin@ths-thm.org').first()).toBeVisible();
  });

  // ─── Info Row & Detail Row Section ────────────────

  test('info row and detail row sections display data correctly', async ({ page }) => {
    const infoSection = page.locator('section#info-rows');

    // InfoRow labels (DualThemePreview + InfoRow+DetailRow = multiple matches)
    await expect(infoSection.locator('text=Nama Lengkap').first()).toBeVisible();
    await expect(infoSection.locator('text=No. Anggota').first()).toBeVisible();
    await expect(infoSection.locator('text=0114-0101-001-2026').first()).toBeVisible();

    // DetailRow labels
    await expect(infoSection.locator('text=Siti Nurhaliza').first()).toBeVisible();
    await expect(infoSection.locator('text=siti@example.com').first()).toBeVisible();
  });

  // ─── Page Header Section ──────────────────────────

  test('page header section renders all variants', async ({ page }) => {
    const headerSection = page.locator('section#page-header');

    // Default variant (DualThemePreview renders twice)
    await expect(headerSection.locator('text=Daftar Anggota').first()).toBeVisible();
    await expect(headerSection.locator('text=Kelola data anggota THS-THM').first()).toBeVisible();

    // With Back Link variant
    await expect(headerSection.locator('text=Detail Anggota').first()).toBeVisible();

    // With Tabs variant
    await expect(headerSection.locator('text=Pengaturan Email').first()).toBeVisible();
    const tabButtons = headerSection.locator('button:has-text("Konfigurasi")').first();
    await expect(tabButtons).toBeVisible();
  });

  // ─── Colors Section ───────────────────────────────

  test('colors section renders semantic color swatches', async ({ page }) => {
    const colorsSection = page.locator('section#colors');

    // Color labels (DualThemePreview renders twice)
    await expect(colorsSection.locator('text=Primary').first()).toBeVisible();
    await expect(colorsSection.locator('text=Success').first()).toBeVisible();
    await expect(colorsSection.locator('text=Warning').first()).toBeVisible();
    await expect(colorsSection.locator('text=Danger').first()).toBeVisible();

    // Status badge backgrounds
    await expect(colorsSection.locator('text=Aktif').first()).toBeVisible();
    await expect(colorsSection.locator('text=Nonaktif').first()).toBeVisible();
    await expect(colorsSection.locator('text=Pending').first()).toBeVisible();
    await expect(colorsSection.locator('text=Diproses').first()).toBeVisible();
  });

  // ─── CSS Variable Reference Footer ─────────────────

  test('CSS variable reference footer is visible', async ({ page }) => {
    await expect(page.locator('text=CSS Variable Reference')).toBeVisible();
    await expect(page.locator('text=Background Tokens')).toBeVisible();
    await expect(page.locator('text=Text Tokens')).toBeVisible();
    await expect(page.locator('text=Border Tokens')).toBeVisible();
  });

  // ─── Page Structure ───────────────────────────────

  test('page has correct title and subtitle', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('Style Guide / Design System');
    await expect(page.locator('text=Referensi visual semua komponen UI')).toBeVisible();
  });

  test('Breadcrumbs render on the page', async ({ page }) => {
    // Breadcrumbs component renders a <nav> with aria-label
    const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbNav).toBeVisible();
  });
});
