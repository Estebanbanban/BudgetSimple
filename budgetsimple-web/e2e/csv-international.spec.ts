import { test, expect } from '@playwright/test';
import { clearAppData, navigateToPage, fillFileInput } from './helpers';

test.describe('International CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, '/connect');
  });

  test('should import CSV with French headers, CA$ currency, and long date format', async ({ page }) => {
    // Your actual CSV format
    const csvContent = `Nom,Coût,Select,date
"IGA Groceries ",CA$99.30,Groceries,"November 2, 2025"
Uber from Airport with Elliot,CA$18.00,Transportation,"November 2, 2025"
Anthropic Credits,CA$21.00,Subscription,"November 1, 2025"
"Suno ",CA$16.00,Subscription,"November 1, 2025"
Couche tard,CA$4.30,Coffee,"November 1, 2025"`;

    await fillFileInput(page, 'txCsvFile', csvContent, 'transactions.csv');
    
    // Wait for file processing
    await page.waitForTimeout(2000);
    
    // Check format panel appears
    const formatPanel = page.locator('#formatPanel');
    await expect(formatPanel).toBeVisible({ timeout: 5000 });
    
    // Check that formats are auto-detected
    const dateFormat = page.locator('#dateFormat');
    await expect(dateFormat).toBeVisible();
    
    const detectedDateFormat = page.locator('#detectedDateFormat');
    await expect(detectedDateFormat).toContainText('Detected:', { timeout: 2000 });
    
    // Verify mapping is auto-detected
    const amountMapping = page.locator('select[data-map="amount"]');
    await expect(amountMapping).toBeVisible();
    const amountValue = await amountMapping.inputValue();
    expect(amountValue).toBe('Coût'); // Should detect French "Coût"
    
    // Import
    const importBtn = page.locator('#btnImportTx');
    await importBtn.click();
    
    await page.waitForTimeout(2000);
    
    // Check success
    const importResult = page.locator('#importResult');
    const resultText = await importResult.textContent();
    expect(resultText).toContain('Imported');
    expect(resultText).not.toContain('No transactions imported');
  });

  test('should handle European number format (1.234,56)', async ({ page }) => {
    const csvContent = `date,description,amount
2025-01-01,Test Purchase,1.234,56
2025-01-02,Another Purchase,99,30`;

    await fillFileInput(page, 'txCsvFile', csvContent);
    await page.waitForTimeout(2000);
    
    // Set European format
    await page.locator('#numberFormat').selectOption('eu');
    
    // Import
    await page.locator('#btnImportTx').click();
    await page.waitForTimeout(2000);
    
    const result = page.locator('#importResult');
    const resultText = await result.textContent();
    expect(resultText).toContain('Imported');
  });

  test('should handle different date formats', async ({ page }) => {
    // Test EU date format
    const csvContent = `date,description,amount
02/11/2025,Test,100
03/11/2025,Test 2,200`;

    await fillFileInput(page, 'txCsvFile', csvContent);
    await page.waitForTimeout(2000);
    
    // Set EU date format
    await page.locator('#dateFormat').selectOption('eu');
    
    // Import
    await page.locator('#btnImportTx').click();
    await page.waitForTimeout(2000);
    
    const result = page.locator('#importResult');
    const resultText = await result.textContent();
    expect(resultText).toContain('Imported');
  });
});





