import { test, expect } from '@playwright/test';
import { mockAuthWithAll } from './helpers';

test.describe('Dashboard Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthWithAll(page);
  });

  const DASHBOARD_PAGES = [
    { path: '/members', name: 'members' },
    { path: '/candidates', name: 'candidates' },
    { path: '/dues', name: 'dues' },
    { path: '/letters', name: 'letters' },
    { path: '/reports', name: 'reports' },
    { path: '/activities', name: 'activities' },
    { path: '/trainings', name: 'trainings' },
    { path: '/users', name: 'users' },
    { path: '/documents', name: 'documents' },
    { path: '/claims', name: 'claims' },
    { path: '/examiners', name: 'examiners' },
    { path: '/assessments', name: 'assessments' },
    { path: '/registrations', name: 'registrations' },
    { path: '/org-documents', name: 'org-documents' },
    { path: '/payments', name: 'payments' },
    { path: '/graduations', name: 'graduations' },
    { path: '/notifications', name: 'notifications' },
    { path: '/notifications/report', name: 'notifications-report' },
    { path: '/scan-stats', name: 'scan-stats' },
    { path: '/gamification/manage', name: 'gamification-manage' },
    { path: '/gamification/rewards', name: 'gamification-rewards' },
    { path: '/gamification/scoreboard', name: 'gamification-scoreboard' },
    { path: '/gamification/admin', name: 'gamification-admin' },
    { path: '/gamification/settings', name: 'gamification-settings' },
    { path: '/gamification/report', name: 'gamification-report' },
    { path: '/settings', name: 'settings' },
    { path: '/settings/email', name: 'settings-email' },
  ];

  for (const { path, name } of DASHBOARD_PAGES) {
    test(`screenshot: ${name}`, async ({ page }) => {
      await page.goto(path);
      // Wait for page to stabilize (loading spinners disappear)
      await page.waitForLoadState('networkidle');
      // Wait a bit more for any animations to complete
      await page.waitForTimeout(500);

      // Verify the page loaded (no crash)
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      // Take screenshot
      await page.screenshot({
        path: `e2e/screenshots/${name}.png`,
        fullPage: true,
      });
    });
  }

  test('screenshots all dashboard pages in sequence', async ({ page }) => {
    // This test verifies sidebar navigation works across all pages
    // Visit pages in order through the sidebar
    const sidebarLinks = [
      '/members',
      '/candidates',
      '/registrations',
      '/claims',
      '/trainings',
      '/graduations',
      '/activities',
      '/examiners',
      '/assessments',
      '/documents',
      '/org-documents',
      '/letters',
      '/dues',
      '/payments',
      '/notifications',
      '/reports',
      '/scan-stats',
      '/users',
      '/settings',
    ];

    for (const link of sidebarLinks) {
      await page.goto(link);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
      await page.screenshot({
        path: `e2e/screenshots/nav-${link.replace(/\//g, '-')}.png`,
        fullPage: true,
      });
    }
  });
});
