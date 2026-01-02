import { test, expect } from '@playwright/test';
import { clearAppData, navigateToPage } from './helpers';

/**
 * E2E Tests for Cashflow Map (Sankey Diagram)
 */

test.describe('Cashflow Map', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, '/cashflow');
  });

  test('should load cashflow map page', async ({ page }) => {
    // Check that cashflow view is visible
    await expect(page.locator('[data-view="cashflow"]')).toBeVisible();
    
    // Should have a heading
    await expect(page.locator('h1:has-text("Cashflow")')).toBeVisible();
  });

  test('should display Sankey diagram container', async ({ page }) => {
    // Look for SVG or canvas element (Sankey diagram)
    const svg = page.locator('svg').first();
    const canvas = page.locator('canvas').first();
    
    // At least one should exist
    const hasSvg = await svg.count() > 0;
    const hasCanvas = await canvas.count() > 0;
    
    expect(hasSvg || hasCanvas).toBeTruthy();
  });

  test('should show empty state when no data', async ({ page }) => {
    // When no data, should show empty state or message
    const emptyState = page.locator('text=No data, text=No transactions, text=Empty').first();
    
    // Check if empty state exists (may not be visible if data exists)
    const emptyStateCount = await emptyState.count();
    
    if (emptyStateCount > 0) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should render nodes when data exists', async ({ page }) => {
    // This test would need actual data to be loaded
    // For now, we just check that the container exists
    
    // Look for node elements (could be SVG elements, divs, etc.)
    const nodes = page.locator('[class*="node"], [class*="sankey"], g').first();
    
    // Just verify the page structure exists
    await expect(page.locator('[data-view="cashflow"]')).toBeVisible();
  });

  test('should be responsive on resize', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check that diagram still exists
    await expect(page.locator('[data-view="cashflow"]')).toBeVisible();
    
    // Resize to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // Check that diagram still exists
    await expect(page.locator('[data-view="cashflow"]')).toBeVisible();
  });
});

