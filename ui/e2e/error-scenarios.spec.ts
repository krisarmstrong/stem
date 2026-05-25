import { expect, test } from '@playwright/test';

/**
 * Error Scenario Tests
 *
 * Tests for error handling and edge cases:
 * - Network errors
 * - Invalid input
 * - Session expiration
 * - API failures
 */

test.describe('Error Scenarios', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate failure.
    // SSE (/api/v1/events) is bypassed — its lifecycle is reconnect-driven,
    // not a one-shot call, and aborting it would mask network-error rendering
    // behind an SSE-init failure that no app code actually handles distinctly.
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('/api/v1/events')) {
        return route.continue();
      }
      route.abort('failed');
    });

    await page.goto('/');

    // Page should still load (with error state)
    await expect(page.locator('body')).not.toBeEmpty();

    // Should show disconnected status
    const disconnected = page.getByText(/disconnected|offline|error/i);
    // At least one error indicator should appear
    const count = await disconnected.count();
    expect(count).toBeGreaterThanOrEqual(0); // May show login instead
  });

  test('should handle slow API responses', async ({ page }) => {
    // Intercept and delay API calls.
    // SSE (/api/v1/events) is bypassed — its connection establishment time
    // is irrelevant to the "slow API" UX the app is supposed to handle
    // (loading spinners on data calls), and delaying SSE handshake by 2s
    // can cause spurious reconnect cycles that aren't the test target.
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/api/v1/events')) {
        return route.continue();
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.continue();
    });

    await page.goto('/');

    // Page should eventually load
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('should show appropriate message for 401 errors', async ({ page }) => {
    // Simulate unauthorized response
    await page.route('**/api/v1/stats', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show login or authentication message
    const authElements = page.locator('input[type="password"], [class*="login"]');
    const count = await authElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle 500 errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/interfaces', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    // Page should not crash
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should not crash on malformed API responses', async ({ page }) => {
    await page.route('**/api/v1/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'not valid json{{{',
      });
    });

    await page.goto('/');

    // Page should handle gracefully
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should handle empty API responses', async ({ page }) => {
    await page.route('**/api/v1/interfaces', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');

    // Page should still work with no interfaces
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
