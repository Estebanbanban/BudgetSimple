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
    
    const today = new Date();
    const toISO = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const d1 = toISO(today);
    const d2 = toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
    const d3 = toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2));
    const csvContent = `Date,Amount,Description,Category
${d3},-50.00,Groceries,Groceries
${d2},-25.00,Coffee,Groceries
${d1},-100.00,Gas,Transport`;

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
    const kpiTotalExpenses = page.locator("#kpiTotalExpenses");
    await expect(kpiTotalExpenses).not.toContainText("--", { timeout: 5000 });
    
    // Check pie chart shows data
    const expensePie = page.locator("#expensePie");
    await expect(expensePie.locator("svg")).toHaveCount(1);
    
    // Navigate away and back
    await navigateToPage(page, "/connect");
    await page.waitForTimeout(500);
    await navigateToPage(page, "/dashboard");
    await page.waitForTimeout(1000);
    
    // Verify data still there
    await expect(kpiTotalExpenses).not.toContainText("--");

    // Reload and verify persistence
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(kpiTotalExpenses).not.toContainText("--");
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




