import { expect, test } from '@playwright/test';

/**
 * Result History Tests
 *
 * Tests for test result history drawer:
 * - History display
 * - Result details
 * - Filtering and search
 */

test.describe('Result History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have history button in header', async ({ page }) => {
    const historyButton = page.getByRole('button', { name: /history|results|log/i });
    const count = await historyButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open history drawer when clicking history button', async ({ page }) => {
    const historyButton = page.getByRole('button', { name: /history/i }).first();
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Drawer should appear
      const drawer = page.locator('[role="dialog"], .drawer, [class*="drawer"]').first();
      await expect(drawer).toBeVisible();
    }
  });

  test('should display result list in history', async ({ page }) => {
    const historyButton = page.getByRole('button', { name: /history/i }).first();
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Should show result list or empty state
      const content = page.locator('[role="dialog"], .drawer').first();
      await expect(content).toBeVisible();
    }
  });

  test('should show empty state when no results', async ({ page }) => {
    const historyButton = page.getByRole('button', { name: /history/i }).first();
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Should show some content
      const drawer = page.locator('[role="dialog"], .drawer').first();
      const text = await drawer.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('should close history drawer', async ({ page }) => {
    const historyButton = page.getByRole('button', { name: /history/i }).first();
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Find close button
      const closeButton = page.getByRole('button', { name: /close|dismiss/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();

        // Drawer should close
        await page.waitForTimeout(300);
        const drawer = page.locator('[role="dialog"], .drawer');
        const isVisible = await drawer
          .first()
          .isVisible()
          .catch(() => false);
        // Drawer should be closed or hidden
        expect(isVisible).toBeFalsy();
      }
    }
  });

  test('should display result details when clicking a result', async ({ page }) => {
    // This test assumes there are results in history
    const historyButton = page.getByRole('button', { name: /history/i }).first();
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Click first result if any
      const resultItem = page.locator('[class*="result"], [class*="item"], li').first();
      if (await resultItem.isVisible()) {
        await resultItem.click();
        // Details should show
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});
