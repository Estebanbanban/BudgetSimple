import { test, expect } from "@playwright/test";
import { clearAppData, navigateToPage } from "./helpers";

async function seedRecurringSubscriptionTransactions(page: any) {
  await page.evaluate(async () => {
    const openReq = indexedDB.open("budgetsimple", 3);
    await new Promise<void>((resolve) => {
      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        if (!db.objectStoreNames.contains("transactions")) db.createObjectStore("transactions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("income")) db.createObjectStore("income", { keyPath: "id" });
        if (!db.objectStoreNames.contains("envelopes")) db.createObjectStore("envelopes", { keyPath: "id" });
        if (!db.objectStoreNames.contains("envelopeContribs")) {
          const s = db.createObjectStore("envelopeContribs", { keyPath: "id" });
          s.createIndex("envelopeId", "envelopeId", { unique: false });
        }
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
        if (!db.objectStoreNames.contains("milestones")) db.createObjectStore("milestones", { keyPath: "id" });
      };
      openReq.onsuccess = () => resolve();
      openReq.onerror = () => resolve();
    });

    const db = openReq.result;
    const tx = db.transaction(["transactions"], "readwrite");
    const store = tx.objectStore("transactions");

    const now = Date.now();
    const rows = [
      { id: "tx-netflix-1", dateISO: "2025-01-15", amount: -15.99, type: "expense", categoryId: "cat-subscriptions", description: "Netflix", account: "Checking", sourceFile: "seed", createdAt: now, hash: "h1" },
      { id: "tx-netflix-2", dateISO: "2025-02-15", amount: -15.99, type: "expense", categoryId: "cat-subscriptions", description: "Netflix", account: "Checking", sourceFile: "seed", createdAt: now + 1, hash: "h2" },
      { id: "tx-netflix-3", dateISO: "2025-03-15", amount: -15.99, type: "expense", categoryId: "cat-subscriptions", description: "Netflix", account: "Checking", sourceFile: "seed", createdAt: now + 2, hash: "h3" }
    ];

    rows.forEach((r) => store.put(r));
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  });
}

test.describe("Subscription Detection (local-first)", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, "/dashboard");
  });

  test("should navigate to subscriptions page", async ({ page }) => {
    await page.goto("/subscriptions");
    await expect(page.locator('h1:has-text("Subscriptions")')).toBeVisible();
  });

  test("should show empty state when no data", async ({ page }) => {
    await page.goto("/subscriptions");
    await expect(page.locator("text=No pending subscription candidates")).toBeVisible();
    await expect(page.locator('button:has-text("Detect")')).toBeVisible();
    // In local-first mode, backend-only range select should not be shown.
    await expect(page.locator("#subscriptionRangeMonths")).toHaveCount(0);
  });

  test("should detect candidates from local transactions", async ({ page }) => {
    await seedRecurringSubscriptionTransactions(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await navigateToPage(page, "/subscriptions");

    // Ensure runtime picked up seeded transactions
    await page.waitForFunction(() => {
      const rt = (window as any).budgetsimpleRuntime;
      return rt && typeof rt.transactions === "function" && rt.transactions().length >= 3;
    });

    // Trigger detection UI recompute (helps if the first load raced runtime init)
    const detectBtn = page.locator('button:has-text("Detect")').first();
    if (await detectBtn.isVisible()) {
      await detectBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator("text=Pending Candidates")).toBeVisible();
    await expect(page.locator("text=Netflix")).toBeVisible();
    await expect(page.locator('button:has-text("Confirm")')).toBeVisible();
  });

  test("should confirm a local subscription and move it out of pending", async ({ page }) => {
    await seedRecurringSubscriptionTransactions(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await navigateToPage(page, "/subscriptions");

    await page.waitForFunction(() => {
      const rt = (window as any).budgetsimpleRuntime;
      return rt && typeof rt.transactions === "function" && rt.transactions().length >= 3;
    });

    const detectBtn = page.locator('button:has-text("Detect")').first();
    if (await detectBtn.isVisible()) {
      await detectBtn.click();
      await page.waitForTimeout(500);
    }

    // Confirm Netflix
    await page.locator('button:has-text("Confirm")').first().click();
    await page.waitForTimeout(500);

    // Pending should be empty
    await expect(page.locator("text=No pending candidates")).toBeVisible();
    // Confirmed history should show Netflix
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.locator("text=Netflix")).toBeVisible();
  });
});

