import { test, expect } from '@playwright/test';
import { clearAppData, navigateToPage, fillFileInput } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
  });

  test('should navigate between all main pages', async ({ page }) => {
    // Start at dashboard
    await navigateToPage(page, '/dashboard');
    await expect(page.locator('[data-view="dashboard"]')).toBeVisible();
    
    // Navigate to cashflow (use nav link specifically)
    await page.locator('nav a[href="/cashflow"]').first().click();
    await expect(page).toHaveURL(/.*\/cashflow/);
    await expect(page.locator('[data-view="cashflow"]')).toBeVisible();
    
    // Navigate to plan
    await page.locator('a[href="/plan"]').click();
    await expect(page).toHaveURL(/.*\/plan/);
    await expect(page.locator('[data-view="plan"]')).toBeVisible();
    
    // Navigate to investing
    await page.locator('a[href="/investing"]').click();
    await expect(page).toHaveURL(/.*\/investing/);
    await expect(page.locator('[data-view="investing"]')).toBeVisible();
    
    // Navigate to connect
    await page.locator('a[href="/connect"]').click();
    await expect(page).toHaveURL(/.*\/connect/);
    await expect(page.locator('[data-view="connect"]')).toBeVisible();
    
    // Navigate to settings
    await page.locator('a[href="/settings"]').click();
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.locator('[data-view="settings"]')).toBeVisible();
  });

  test('should toggle navigation sidebar', async ({ page }) => {
    await navigateToPage(page, '/dashboard');
    
    const navToggle = page.locator('#btnToggleNav');
    await expect(navToggle).toBeVisible();
    
    // Check initial state (should not be collapsed)
    const body = page.locator('body');
    let hasCollapsedClass = await body.evaluate((el) => el.classList.contains('nav-collapsed'));
    expect(hasCollapsedClass).toBe(false);
    
    // Toggle nav
    await navToggle.click();
    await page.waitForTimeout(500);
    
    // Should be collapsed now
    hasCollapsedClass = await body.evaluate((el) => el.classList.contains('nav-collapsed'));
    expect(hasCollapsedClass).toBe(true);
    
    // Toggle again
    await navToggle.click();
    await page.waitForTimeout(500);
    
    // Should not be collapsed
    hasCollapsedClass = await body.evaluate((el) => el.classList.contains('nav-collapsed'));
    expect(hasCollapsedClass).toBe(false);
  });

  test('should open settings from header button', async ({ page }) => {
    await navigateToPage(page, '/dashboard');
    
    const settingsBtn = page.locator('#btnSetup');
    await expect(settingsBtn).toBeVisible();
    
    await settingsBtn.click();
    
    // Should navigate to settings
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.locator('[data-view="settings"]')).toBeVisible();
  });

  test('should reset all data', async ({ page }) => {
    await navigateToPage(page, '/dashboard');
    
    // Add some data first (quick add)
    await page.locator('#btnQuickAdd').click();
    await page.waitForTimeout(500);
    
    const today = new Date().toISOString().split('T')[0];
    await page.locator('#qaIncomeDate').fill(today);
    await page.locator('#qaIncomeAmount').fill('1000');
    await page.locator('#qaAddIncome').click();
    await page.waitForTimeout(1000);
    
    // Close modal if still open
    const modal = page.locator('#quickAdd');
    const isModalVisible = await modal.isVisible().catch(() => false);
    if (isModalVisible) {
      const closeBtn = modal.locator('button[data-close]').first();
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Click reset button
    const resetBtn = page.locator('#btnResetAll');
    await expect(resetBtn).toBeVisible();
    
    // Set up dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    
    await resetBtn.click();
    await page.waitForTimeout(2000);
    
    // Data should be cleared - navigate to connect to verify
    await navigateToPage(page, '/connect');
    
    const incomeTable = page.locator('#incomeTable');
    const tableContent = await incomeTable.textContent();
    // Should be empty or show an empty state
    expect(tableContent).toMatch(/No data yet|No income yet|^[\s\n]*$/);
  });

  test('should render imported data after navigation without reload', async ({ page }) => {
    await navigateToPage(page, '/connect');

    const today = new Date().toISOString().split('T')[0];
    const csv = `date,amount,description,category\n${today},-12.34,Coffee,Food`;
    await fillFileInput(page, 'txCsvFile', csv, 'tx.csv');
    await page.waitForSelector('[data-step="map"]');
    await page.locator('#btnImportTx').click();

    await page.locator('nav a[href="/dashboard"]').click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-view="dashboard"]')).toBeVisible();

    const totalExpenses = page.locator('#kpiTotalExpenses');
    await expect(totalExpenses).not.toHaveText('');
    await expect(totalExpenses).toContainText('$12');
  });
});
