import { expect, test } from '@playwright/test';
import { skipSetupWizard } from './helpers/auth';

/**
 * Result History Tests
 *
 * Tests for the result history drawer triggered from the header bar.
 *
 * Uses skipSetupWizard() to skip the login modal — these tests don't
 * exercise the auth flow itself (see helpers/auth.ts).
 */

test.describe('Result History', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupWizard(page);
    await page.goto('/');
  });

  test('should have history button in sidebar', async ({ page }) => {
    await expect(page.getByTestId('sidebar-history-button')).toBeVisible();
  });

  test('should open history drawer when clicking history button', async ({ page }) => {
    await page.getByTestId('sidebar-history-button').click();
    await expect(page.getByTestId('history-drawer')).toBeVisible();
  });

  test('should display content in history drawer', async ({ page }) => {
    await page.getByTestId('sidebar-history-button').click();

    const drawer = page.getByTestId('history-drawer');
    await expect(drawer).toBeVisible();

    const text = await drawer.textContent();
    expect(text?.length ?? 0).toBeGreaterThan(0);
  });

  test('should close history drawer', async ({ page }) => {
    await page.getByTestId('sidebar-history-button').click();

    const drawer = page.getByTestId('history-drawer');
    await expect(drawer).toBeVisible();

    await page.getByTestId('history-drawer-close').click();
    await expect(drawer).not.toBeVisible();
  });
});
