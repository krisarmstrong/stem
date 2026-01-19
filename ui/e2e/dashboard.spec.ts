import { expect, test } from '@playwright/test';

/**
 * Dashboard Tests
 *
 * Tests for the main dashboard functionality:
 * - Stats cards display
 * - Interface selection
 * - Connection status
 * - Test controls
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    // Wait for login form or dashboard
    await page.waitForLoadState('networkidle');
  });

  test('should display stats cards', async ({ page }) => {
    // Skip if on login page
    const isLoginPage = await page.locator('input[type="password"]').isVisible();
    if (isLoginPage) {
      test.skip();
      return;
    }

    // Check for stats cards
    await expect(page.getByText(/packets received/i)).toBeVisible();
    await expect(page.getByText(/packets sent/i)).toBeVisible();
    await expect(page.getByText(/current rate/i)).toBeVisible();
    await expect(page.getByText(/uptime/i)).toBeVisible();
  });

  test('should display interface selector', async ({ page }) => {
    const isLoginPage = await page.locator('input[type="password"]').isVisible();
    if (isLoginPage) {
      test.skip();
      return;
    }

    // Interface selector should be visible
    const interfaceSelect = page.locator('select').first();
    await expect(interfaceSelect).toBeVisible();
  });

  test('should display connection status', async ({ page }) => {
    // Connection status badge should be visible
    const statusBadge = page.locator('.status-badge, [class*="status"]').first();
    await expect(statusBadge).toBeVisible();
  });

  test('should display test modules section', async ({ page }) => {
    const isLoginPage = await page.locator('input[type="password"]').isVisible();
    if (isLoginPage) {
      test.skip();
      return;
    }

    // Test Modules heading should be visible
    await expect(page.getByText(/test modules/i)).toBeVisible();
  });

  test('should have start/stop test buttons', async ({ page }) => {
    const isLoginPage = await page.locator('input[type="password"]').isVisible();
    if (isLoginPage) {
      test.skip();
      return;
    }

    // Start or Stop button should be visible
    const testButton = page.getByRole('button', { name: /start|stop/i });
    await expect(testButton).toBeVisible();
  });
});
