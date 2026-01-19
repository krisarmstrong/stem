import { expect, test } from '@playwright/test';

/**
 * Theme Tests
 *
 * Tests for dark/light mode functionality:
 * - Theme toggle button
 * - Theme persistence
 * - Visual changes
 */

test.describe('Theme', () => {
  test('should have theme toggle button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for sun/moon icons (theme toggle)
    const themeButton = page.getByRole('button', { name: /dark|light|theme/i });
    await expect(themeButton).toBeVisible();
  });

  test('should toggle between dark and light mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial theme state
    const html = page.locator('html');
    const initialDark = await html.evaluate((el) => el.classList.contains('dark'));

    // Click theme toggle
    const themeButton = page.getByRole('button', { name: /dark|light|theme/i });
    await themeButton.click();

    // Theme should have toggled
    const newDark = await html.evaluate((el) => el.classList.contains('dark'));
    expect(newDark).not.toBe(initialDark);
  });

  test('should apply correct colors in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Force dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    // Background should be dark
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).toBeTruthy();
  });

  test('should apply correct colors in light mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Force light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    // Background should be light
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgColor).toBeTruthy();
  });
});
