import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers';

/**
 * Section IDs in the style-guide page.
 */
const SECTION_IDS = [
  'typography',
  'colors',
  'buttons',
  'badges',
  'inputs',
  'avatars',
  'tables',
  'info-rows',
  'search-bar',
  'pagination',
  'page-header',
] as const;

/** Sections with interactive overlays (modal/confirm) are tested separately. */
const INTERACTIVE_SECTIONS = ['modals'] as const;

const ALL_SECTIONS = [...SECTION_IDS, ...INTERACTIVE_SECTIONS] as const;

/**
 * Playwright's built-in toHaveScreenshot() uses pixelmatch internally.
 *
 * maxDiffPixelRatio: 0.01  →  fail if more than 1% of pixels differ.
 *
 * ## Updating Baselines
 *
 * Run once to create baseline snapshots:
 *   npx playwright test style-guide-visual.spec.ts --update-snapshots --reporter=line
 *
 * Subsequent runs compare against the stored baselines:
 *   npx playwright test style-guide-visual.spec.ts --reporter=line
 *
 * Baselines are stored at:
 *   apps/web/e2e/style-guide-visual.spec.ts-snapshots/
 */
const SCREENSHOT_OPTS = {
  maxDiffPixelRatio: 0.01,
};

/** Options for full-page screenshots (used only with page-level toHaveScreenshot). */
const FULL_PAGE_OPTS = {
  maxDiffPixelRatio: 0.01,
  fullPage: true,
};

test.describe('Style Guide — Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await page.goto('/style-guide');
    // Wait for the page to be fully rendered
    await expect(page.locator('h1').first()).toContainText('Style Guide');
    // Wait for all fonts and images to load
    await page.waitForLoadState('networkidle');
  });

  // ─── Full Page Screenshot ─────────────────────────

  test('full page — light theme', async ({ page }) => {
    // Ensure the page is in light mode (default state, no dark class)
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForTimeout(300);
    // Take the initial viewport screenshot — captures the above-the-fold content
    await expect(page).toHaveScreenshot('full-page-light.png', {
      ...SCREENSHOT_OPTS,
      fullPage: false,
    });
  });

  test('full page scroll — light theme', async ({ page }) => {
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForTimeout(300);
    // Full-page screenshot captures everything below the fold too
    await expect(page).toHaveScreenshot('full-page-scroll-light.png', FULL_PAGE_OPTS);
  });

  // ─── Section Screenshots — Static Sections ───────

  for (const id of SECTION_IDS) {
    test(`${id} section — light theme`, async ({ page }) => {
      const section = page.locator(`section#${id}`);
      await expect(section).toBeVisible({ timeout: 5000 });

      // Scroll the section into view then take a full-page capture
      // This ensures the section is rendered before screenshotting
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      await expect(section).toHaveScreenshot(`section-${id}-light.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });
  }

  // ─── Modals Section — Static Content Only ────────

  test('modals section — light theme (no modal open)', async ({ page }) => {
    const section = page.locator('section#modals');
    await expect(section).toBeVisible({ timeout: 5000 });
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Take screenshot without opening any modal
    await expect(section).toHaveScreenshot('section-modals-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  // ─── Modal Interaction Screenshots ────────────────

  test('modal open — light theme', async ({ page }) => {
    const modalsSection = page.locator('section#modals');
    await expect(modalsSection).toBeVisible({ timeout: 5000 });
    await modalsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Open the modal
    await modalsSection.locator('button:has-text("Buka Modal")').first().click();
    await page.waitForTimeout(300);

    // Full page screenshot captures the modal overlay
    await expect(page).toHaveScreenshot('modal-open-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('confirm dialog open — light theme', async ({ page }) => {
    const modalsSection = page.locator('section#modals');
    await expect(modalsSection).toBeVisible({ timeout: 5000 });
    await modalsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Open the confirm dialog
    await modalsSection.locator('button:has-text("Buka Konfirmasi")').first().click();
    await page.waitForTimeout(300);

    // Full page screenshot captures the confirm overlay
    await expect(page).toHaveScreenshot('confirm-open-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  // ─── Pagination Interaction Screenshots ───────────

  test('pagination after click — light theme', async ({ page }) => {
    const paginationSection = page.locator('section#pagination');
    await expect(paginationSection).toBeVisible({ timeout: 5000 });
    await paginationSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Click page 2
    const page2Btn = paginationSection.locator('button:has-text("2")').first();
    await page2Btn.click();
    await page.waitForTimeout(200);

    // Screenshot the pagination section after interaction
    await expect(paginationSection).toHaveScreenshot('pagination-after-click-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  // ─── Search Interaction Screenshots ───────────────

  test('search bar with text — light theme', async ({ page }) => {
    const searchSection = page.locator('section#search-bar');
    await expect(searchSection).toBeVisible({ timeout: 5000 });
    await searchSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Type text into the search bar
    const searchInput = searchSection.locator('input[placeholder="Cari anggota..."]').first();
    await searchInput.fill('test query');
    await page.waitForTimeout(100);

    // Screenshot showing the filled search bar
    await expect(searchSection).toHaveScreenshot('search-filled-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  // ─── CSS Variable Reference Footer ────────────────

  test('CSS variable reference footer — light theme', async ({ page }) => {
    const footer = page.locator('text=CSS Variable Reference');
    await expect(footer).toBeVisible({ timeout: 5000 });
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Capture the footer card container (parent of the h3 heading)
    const footerContainer = page.locator('text=CSS Variable Reference').locator('..');
    await expect(footerContainer).toHaveScreenshot('css-variables-footer-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
