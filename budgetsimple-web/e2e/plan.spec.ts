import { test, expect } from "@playwright/test";
import { clearAppData, navigateToPage } from "./helpers";

test.describe("Plan", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, "/plan");
  });

  test("should create envelope and add contribution", async ({ page }) => {
    await page.locator(".envelope-add").click();
    await page.fill("#createEnvelopeName", "Trip");
    await page.fill("#createEnvelopeTarget", "1200");
    await page.locator("#createEnvelopeForm button[type=\"submit\"]").click();

    const envelopeCard = page.locator(".envelope-card", { hasText: "Trip" });
    await expect(envelopeCard).toBeVisible();
    await envelopeCard.click();

    await expect(page.locator("#envelopeModal")).toBeVisible();
    await page.fill("#envelopeContribAmount", "150");
    await page.locator("#envelopeContribForm button[type=\"submit\"]").click();

    const rows = await page.locator("#envelopeContribTable tr").count();
    expect(rows).toBeGreaterThan(0);
    await expect(page.locator("#envelopeChart svg")).toBeVisible();
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
