import { expect, test } from "@playwright/test";
import { clearAppData, navigateToPage } from "./helpers";

test.describe("Category changes panel", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
  });

  test("renders top changes from MoM API", async ({ page }) => {
    await page.route("**/api/mom*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          changes: [
            {
              category: "Dining",
              change: 120,
              percent: 18.5,
              direction: "increase",
              drilldownUrl: "/cashflow?category=Dining",
            },
            {
              category: "Groceries",
              change: -75,
              percent: -12,
              direction: "decrease",
            },
            {
              category: "Transport",
              change: 44,
              percent: 8.5,
              direction: "increase",
            },
          ],
        }),
      });
    });

    await navigateToPage(page, "/dashboard");

    await expect(page.locator("#categoryChangesList .action-item")).toHaveCount(3);
    await expect(page.locator("#categoryChangesList")).toContainText("Dining");

    const firstLink = page.locator("#categoryChangesList .action-item a").first();
    await expect(firstLink).toHaveAttribute("href", /cashflow/);
  });

  test("shows loading then empty state when no changes", async ({ page }) => {
    await page.route("**/api/mom*", async (route) => {
      await page.waitForTimeout(1500);
      await route.fulfill({ status: 200, json: { changes: [] } });
    });

    await navigateToPage(page, "/dashboard");

    await expect(
      page.getByTestId("category-changes-loading")
    ).toBeVisible();
    await expect(page.locator("#categoryChangesEmpty")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows error state when API fails", async ({ page }) => {
    await page.route("**/api/mom*", (route) => route.abort());

    await navigateToPage(page, "/dashboard");

    await expect(page.getByTestId("category-changes-error")).toBeVisible();
  });
});

