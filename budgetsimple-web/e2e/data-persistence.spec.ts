import { test, expect } from "@playwright/test";
import { clearAppData, navigateToPage, fillFileInput } from "./helpers";

test.describe("Data Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, "/dashboard");
    await page.waitForTimeout(500);
  });

  test("should persist transactions after CSV import", async ({ page }) => {
    // Upload CSV
    await navigateToPage(page, "/connect");
    await page.waitForTimeout(500);
    
    const csvContent = `Date,Amount,Description,Category
2024-01-15,-50.00,Groceries,Groceries
2024-01-16,-25.00,Coffee,Coffee
2024-01-17,-100.00,Gas,Transportation`;

    await fillFileInput(page, "txCsvFile", csvContent, "test.csv");
    await page.waitForTimeout(1000);

    // Wait for mapping panel
    await expect(page.locator("#mappingPanel")).toBeVisible({ timeout: 5000 });
    
    // Import
    await page.click("#btnImportTx");
    await page.waitForTimeout(2000);
    
    // Check import result
    const importResult = page.locator("#importResult");
    await expect(importResult).toContainText("Imported", { timeout: 5000 });

    // Navigate to dashboard
    await navigateToPage(page, "/dashboard");
    await page.waitForTimeout(1000);

    // Verify transactions appear in dashboard
    // Check KPI cards show values
    const kpiBurnRate = page.locator("#kpiBurnRate");
    await expect(kpiBurnRate).not.toContainText("--", { timeout: 5000 });
    
    // Check pie chart shows data
    const expensePie = page.locator("#expensePie");
    await expect(expensePie.locator("svg")).toBeVisible();
    
    // Navigate away and back
    await navigateToPage(page, "/connect");
    await page.waitForTimeout(500);
    await navigateToPage(page, "/dashboard");
    await page.waitForTimeout(1000);
    
    // Verify data still there
    await expect(kpiBurnRate).not.toContainText("--");

    // Reload and verify persistence
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(kpiBurnRate).not.toContainText("--");
  });

  test("should persist rent amount correctly", async ({ page }) => {
    await navigateToPage(page, "/connect");
    await page.waitForTimeout(500);

    // Enter rent amount
    await page.fill("#importRentAmount", "1000");
    await page.selectOption("#importRentMode", "monthly");
    await page.click("#btnSaveRentFromImport");
    await page.waitForTimeout(1000);

    // Navigate to dashboard
    await navigateToPage(page, "/dashboard");
    await page.waitForTimeout(1000);

    // Check rent is displayed correctly (not 7000)
    const rentTable = page.locator("#rentBenchmarkTable");
    if (await rentTable.isVisible()) {
      const rentText = await rentTable.textContent();
      expect(rentText).not.toContain("7000");
      expect(rentText).toMatch(/1000|1,000/);
    }
  });

  test("should exclude rent from subscriptions", async ({ page }) => {
    // Import transactions with rent
    await navigateToPage(page, "/connect");
    await page.waitForTimeout(500);
    
    const csvContent = `Date,Amount,Description,Category
2024-01-01,-1000.00,Rent,Rent
2024-01-02,-29.99,Netflix,Subscriptions
2024-01-03,-9.99,Spotify,Subscriptions`;

    await fillFileInput(page, "txCsvFile", csvContent, "test.csv");
    await page.waitForTimeout(1000);
    
    await expect(page.locator("#mappingPanel")).toBeVisible({ timeout: 5000 });
    await page.click("#btnImportTx");
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await navigateToPage(page, "/dashboard");
    await page.waitForTimeout(1000);

    // Check subscriptions table doesn't include rent
    const subscriptionsTable = page.locator("#subscriptionsTable");
    if (await subscriptionsTable.isVisible()) {
      const subscriptionsText = await subscriptionsTable.textContent();
      expect(subscriptionsText?.toLowerCase()).not.toContain("rent");
    }
  });
});




