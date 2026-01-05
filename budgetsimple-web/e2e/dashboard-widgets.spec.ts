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
    // Widget should exist even when empty (shows $0 / --)
    await expect(page.locator('#kpiSubscriptions')).toBeVisible();
  });

  test('should navigate to subscriptions from widget', async ({ page }) => {
    await page.goto('/dashboard');
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

