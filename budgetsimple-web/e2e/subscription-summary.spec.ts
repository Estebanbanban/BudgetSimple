import { test, expect } from "@playwright/test";
import { clearAppData, navigateToPage } from "./helpers";

async function seedAndConfirmNetflix(page: any) {
  // Seed 3 monthly expenses and a confirmed subscription record (local-first)
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
    const tx = db.transaction(["transactions", "meta"], "readwrite");
    const store = tx.objectStore("transactions");
    const now = Date.now();
    [
      { id: "tx-netflix-1", dateISO: "2025-01-15", amount: -15.99, type: "expense", categoryId: "cat-subscriptions", description: "Netflix", account: "Checking", sourceFile: "seed", createdAt: now, hash: "h1" },
      { id: "tx-netflix-2", dateISO: "2025-02-15", amount: -15.99, type: "expense", categoryId: "cat-subscriptions", description: "Netflix", account: "Checking", sourceFile: "seed", createdAt: now + 1, hash: "h2" },
      { id: "tx-netflix-3", dateISO: "2025-03-15", amount: -15.99, type: "expense", categoryId: "cat-subscriptions", description: "Netflix", account: "Checking", sourceFile: "seed", createdAt: now + 2, hash: "h3" }
    ].forEach((r) => store.put(r));

    // Also persist a confirmed subscription so summary page can show it without backend.
    const meta = tx.objectStore("meta");
    meta.put({
      key: "subscriptions:v1",
      value: {
        version: 1,
        recordsByKey: {
          netflix: {
            id: "sub-netflix",
            merchant: "Netflix",
            merchantKey: "netflix",
            estimatedMonthlyAmount: 15.99,
            frequency: "monthly",
            status: "confirmed",
            source: "detected",
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString()
          }
        }
      }
    });
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  });
}

test.describe("Subscription Summary (local-first)", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, "/dashboard");
  });

  test("should navigate to subscription summary page", async ({ page }) => {
    await page.goto("/subscriptions/summary");
    await expect(page.locator('h1:has-text("Subscription Summary")')).toBeVisible();
  });

  test("should show empty summary gracefully", async ({ page }) => {
    await page.goto("/subscriptions/summary");
    await expect(page.locator(".card-value", { hasText: "$0.00" }).first()).toBeVisible();
  });

  test("should display local confirmed subscription in summary", async ({ page }) => {
    await seedAndConfirmNetflix(page);
    await page.reload({ waitUntil: "domcontentloaded" });

    const hasMeta = await page.evaluate(async () => {
      const openReq = indexedDB.open("budgetsimple", 3);
      await new Promise<void>((resolve) => {
        openReq.onsuccess = () => resolve();
        openReq.onerror = () => resolve();
      });
      const db = openReq.result;
      const tx = db.transaction(["meta"], "readonly");
      const store = tx.objectStore("meta");
      const req = store.get("subscriptions:v1");
      const value = await new Promise<any>((resolve) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      db.close();
      return !!value?.value?.recordsByKey?.netflix;
    });
    expect(hasMeta).toBe(true);

    await page.goto("/subscriptions/summary");
    await expect(page.locator("text=Subscription Summary")).toBeVisible();
    await expect(page.locator("text=Active Subscriptions")).toBeVisible();
    await expect(page.locator("text=Netflix")).toBeVisible({ timeout: 15000 });
  });
});
