import { Page } from '@playwright/test';

/**
 * Clear all app data (IndexedDB and localStorage)
 * Note: Page must be navigated to a same-origin URL first
 */
export async function clearAppData(page: Page) {
  // Navigate to the app first to ensure we're in the right context
  try {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch {
    // If navigation fails, try to evaluate anyway
  }
  
  await page.evaluate(() => {
    try {
      // Clear localStorage
      localStorage.clear();
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Clear IndexedDB
    return new Promise<void>((resolve) => {
      try {
        const deleteReq = indexedDB.deleteDatabase('budgetsimple');
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => resolve(); // Continue even if delete fails
        deleteReq.onblocked = () => resolve(); // Continue even if blocked
        // Timeout after 2 seconds
        setTimeout(() => resolve(), 2000);
      } catch (e) {
        resolve(); // Continue even if IndexedDB access fails
      }
    });
  });
  
  // Wait a bit for cleanup
  await page.waitForTimeout(1000);
}

/**
 * Wait for the app runtime to initialize
 * This is now handled in navigateToPage, but kept for backward compatibility
 */
export async function waitForAppReady(page: Page) {
  // Wait a bit for runtime to initialize
  await page.waitForTimeout(1000);
}

/**
 * Navigate to a specific page and wait for it to load
 */
export async function navigateToPage(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Determine the view name from the path
  const viewName = path.replace('/', '') || 'dashboard';
  // Wait for the specific view to be visible
  await page.waitForSelector(`[data-view="${viewName}"]`, { timeout: 10000 });
  await page.waitForTimeout(1000); // Allow runtime to initialize and render
}

/**
 * Fill a file input with file contents
 */
export async function fillFileInput(page: Page, inputId: string, content: string, fileName: string = 'test.csv') {
  const input = page.locator(`#${inputId}`);
  await input.setInputFiles({
    name: fileName,
    mimeType: 'text/csv',
    buffer: Buffer.from(content),
  });
}

/**
 * Wait for element to be visible and enabled
 */
export async function waitForEnabled(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  await element.waitFor({ state: 'attached', timeout });
  // Check if it's not disabled
  const isDisabled = await element.getAttribute('disabled');
  if (isDisabled !== null) {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && !el.hasAttribute('disabled');
      },
      selector,
      { timeout }
    );
  }
}

