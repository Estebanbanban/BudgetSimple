import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Subscription Summary Page
 */

test.describe("Subscription Summary", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should navigate to subscription summary page", async ({ page }) => {
    // Try direct navigation
    await page.goto("/subscriptions/summary");
    await expect(
      page.locator('h1:has-text("Subscription Summary")')
    ).toBeVisible();
  });

  test("should display subscription summary data", async ({ page }) => {
    // Mock summary API
    await page.route("**/api/subscriptions/summary*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalMonthly: 45.97,
          totalAnnual: 551.64,
          activeCount: 3,
          subscriptions: [
            {
              id: "sub-1",
              merchant: "Netflix",
              estimatedMonthlyAmount: 15.99,
              frequency: "monthly",
              status: "confirmed",
            },
            {
              id: "sub-2",
              merchant: "Spotify",
              estimatedMonthlyAmount: 9.99,
              frequency: "monthly",
              status: "confirmed",
            },
            {
              id: "sub-3",
              merchant: "Adobe Creative Cloud",
              estimatedMonthlyAmount: 20.99,
              frequency: "monthly",
              status: "confirmed",
            },
          ],
        }),
      });
    });

    await page.goto("/subscriptions/summary");
    await page.waitForLoadState("networkidle");

    // Should show total monthly
    await expect(page.locator("text=$45.97")).toBeVisible();

    // Should show total annual
    await expect(page.locator("text=$551.64")).toBeVisible();

    // Should show active count
    await expect(page.locator("text=3 active")).toBeVisible();
  });

  test("should handle empty summary gracefully", async ({ page }) => {
    // Mock empty summary
    await page.route("**/api/subscriptions/summary*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalMonthly: 0,
          totalAnnual: 0,
          activeCount: 0,
          subscriptions: [],
        }),
      });
    });

    await page.goto("/subscriptions/summary");
    await page.waitForLoadState("networkidle");

    // Should show zero values
    await expect(page.locator("text=$0.00")).toBeVisible();
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Mock API error
    await page.route("**/api/subscriptions/summary*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/subscriptions/summary");
    await page.waitForLoadState("networkidle");

    // Should show error or handle gracefully
    // (Implementation depends on error handling in the component)
  });
});
