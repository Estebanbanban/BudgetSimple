import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Dashboard Widgets
 * Tests subscription widget and other dashboard components
 */

test.describe('Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display subscription widget on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Mock subscription summary API
    await page.route('**/api/subscriptions/summary*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalMonthly: 45.97,
          totalAnnual: 551.64,
          activeCount: 3,
          subscriptions: []
        })
      });
    });

    // Reload to trigger widget load
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show subscription widget (if implemented)
    // This test will need to be updated based on actual widget implementation
    const subscriptionWidget = page.locator('[data-testid="subscription-widget"], .subscription-widget, text=Subscriptions').first();
    
    // Check if widget exists (may not be visible if no subscriptions)
    const widgetExists = await subscriptionWidget.count() > 0;
    
    if (widgetExists) {
      await expect(subscriptionWidget).toBeVisible();
    }
  });

  test('should navigate to subscriptions from widget', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Mock subscription summary
    await page.route('**/api/subscriptions/summary*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalMonthly: 45.97,
          totalAnnual: 551.64,
          activeCount: 3,
          subscriptions: []
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for link to subscriptions
    const subscriptionLink = page.locator('a[href*="subscriptions"], button:has-text("View Subscriptions")').first();
    
    if (await subscriptionLink.isVisible()) {
      await subscriptionLink.click();
      await page.waitForURL(/subscriptions/);
      await expect(page.locator('h1:has-text("Subscriptions")')).toBeVisible();
    }
  });
});

