import { test, expect } from '@playwright/test';
import { clearAppData, navigateToPage, fillFileInput } from './helpers';

test.describe('Onboarding guided tour', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, '/connect');
  });

  test('should enforce required steps and advance on import', async ({ page }) => {
    await expect(page.locator('[data-step="upload"]')).toBeVisible();

    await page.locator('[data-step="upload"] [data-onboard-next]').click();
    await expect(page.locator('#onboardMessage')).toContainText('Complete this step');

    const csv = `date,amount,description,category\n2025-01-01,-12.34,Coffee,Food`;
    await fillFileInput(page, 'txCsvFile', csv, 'tx.csv');

    await expect(page.locator('[data-step="map"]')).toBeVisible();

    await page.locator('[data-step="map"] [data-onboard-next]').click();
    await expect(page.locator('#onboardMessage')).toContainText('Complete this step');

    await page.waitForSelector('#mappingGrid select');
    await page.locator('#btnImportTx').click();

    await expect(page.locator('[data-step="accounts"]')).toBeVisible();
  });

  test('should persist completed steps on return', async ({ page }) => {
    const csv = `date,amount,description,category\n2025-01-01,-12.34,Coffee,Food`;
    await fillFileInput(page, 'txCsvFile', csv, 'tx.csv');
    await page.waitForSelector('#mappingGrid select');
    await page.locator('#btnImportTx').click();

    await expect(page.locator('[data-step="accounts"]')).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-step="accounts"]')).toBeVisible();
    await expect(page.locator('.onboard-step[data-step-target="upload"]')).toHaveClass(/is-complete/);
    await expect(page.locator('.onboard-step[data-step-target="map"]')).toHaveClass(/is-complete/);
  });
});
