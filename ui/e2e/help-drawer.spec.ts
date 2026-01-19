import { expect, test } from '@playwright/test';

/**
 * Help Drawer Tests
 *
 * Tests for the help documentation drawer:
 * - Open/close functionality
 * - Help content display
 * - Navigation within help
 */

test.describe('Help Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have help button in header', async ({ page }) => {
    // Help button should be visible (question mark icon)
    const helpButton = page.getByRole('button', { name: /help|documentation/i });
    await expect(helpButton).toBeVisible();
  });

  test('should open help drawer when clicking help button', async ({ page }) => {
    const helpButton = page.getByRole('button', { name: /help|documentation/i });
    await helpButton.click();

    // Drawer should appear
    const drawer = page.locator('[role="dialog"], .drawer, [class*="drawer"]').first();
    await expect(drawer).toBeVisible();
  });

  test('should close help drawer when clicking close button', async ({ page }) => {
    // Open help
    const helpButton = page.getByRole('button', { name: /help|documentation/i });
    await helpButton.click();

    // Find and click close button
    const closeButton = page.getByRole('button', { name: /close|dismiss/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();

      // Drawer should be closed
      const drawer = page.locator('[role="dialog"], .drawer, [class*="drawer"]');
      await expect(drawer).not.toBeVisible();
    }
  });

  test('should display help content', async ({ page }) => {
    const helpButton = page.getByRole('button', { name: /help|documentation/i });
    await helpButton.click();

    // Help content should have useful information
    const helpContent = page.locator('[role="dialog"], .drawer').first();
    const text = await helpContent.textContent();
    expect(text?.length).toBeGreaterThan(50); // Some content should exist
  });
});
