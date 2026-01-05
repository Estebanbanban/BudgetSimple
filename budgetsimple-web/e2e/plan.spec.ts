import { test, expect } from "@playwright/test";
import { clearAppData, navigateToPage } from "./helpers";

test.describe("Plan", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, "/plan");
  });

  test("should add a milestone", async ({ page }) => {
    await expect(page.locator("[data-milestone-manager]")).toHaveCount(1);
    await page.waitForFunction(() => (window as any).budgetsimpleRuntime);

    // With no milestones, the add form should be visible by default.
    const labelInput = page.getByPlaceholder("Milestone label (e.g., 'Save $50k')");

    // Fill add form (shown by milestones manager)
    await expect(labelInput).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("Milestone label (e.g., 'Save $50k')").fill('Save $50k');
    await page.getByPlaceholder('Target value').fill('50000');

    await page.locator('[data-milestone-add]').click();

    // Should appear in table
    await expect(page.locator('text=Save $50k')).toBeVisible();
  });

  test("should edit and remove budgets", async ({ page }) => {
    await page.selectOption("#budgetCategory", { label: "Groceries" });
    await page.fill("#budgetAmount", "300");
    await page.locator("#budgetForm button[type=\"submit\"]").click();

    await expect(page.locator("#budgetsTable")).toContainText("Groceries");
    await expect(page.locator("#budgetsTable")).toContainText("300");

    await page.locator('[data-budget-action="edit"]').click();
    await page.fill("#budgetAmount", "450");
    await page.locator("#budgetForm button[type=\"submit\"]").click();
    await expect(page.locator("#budgetsTable")).toContainText("450");

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator('[data-budget-action="remove"]').click();
    await expect(page.locator("#budgetsTable")).toContainText("No budgets yet");
  });
});
