import { test, expect } from '@playwright/test';
import { clearAppData, navigateToPage, fillFileInput } from './helpers';

test.describe('CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, '/connect');
  });

  test('should upload transactions CSV', async ({ page }) => {
    const csvContent = `date,description,amount,account
2025-01-01,Paycheck,3200,Checking
2025-01-02,Rent,-1400,Checking
2025-01-03,Trader Joe's,-86.42,Checking`;

    const fileInput = page.locator('#txCsvFile');
    
    // Fill the file input
    await fillFileInput(page, 'txCsvFile', csvContent, 'transactions.csv');
    
    // Wait for file processing
    await page.waitForTimeout(1000);
    
    // Check that mapping panel appears
    const mappingPanel = page.locator('#mappingPanel');
    await expect(mappingPanel).toBeVisible({ timeout: 5000 });
    
    // Check that preview panel appears
    const previewPanel = page.locator('#previewPanel');
    await expect(previewPanel).toBeVisible({ timeout: 5000 });
    
    // Check that file note shows file name
    const fileNote = page.locator('#txFileNote');
    await expect(fileNote).toContainText('transactions.csv', { timeout: 3000 });
  });

  test('should map CSV columns correctly', async ({ page }) => {
    const csvContent = `date,description,amount,account
2025-01-01,Paycheck,3200,Checking
2025-01-02,Rent,-1400,Checking`;

    await fillFileInput(page, 'txCsvFile', csvContent);
    await page.waitForTimeout(2000);
    
    // Check that mapping grid is visible
    const mappingGrid = page.locator('#mappingGrid');
    await expect(mappingGrid).toBeVisible();
    
    // Check that date mapping select exists
    const dateMapping = page.locator('select[data-map="date"]');
    await expect(dateMapping).toBeVisible();
    
    // Verify date column is auto-selected
    const dateValue = await dateMapping.inputValue();
    expect(dateValue).toBe('date'); // Should auto-detect
  });

  test('should import transactions after mapping', async ({ page }) => {
    const csvContent = `date,description,amount,account
2025-01-01,Paycheck,3200,Checking
2025-01-02,Rent,-1400,Checking
2025-01-03,Trader Joe's,-86.42,Checking`;

    await fillFileInput(page, 'txCsvFile', csvContent);
    await page.waitForTimeout(2000);
    
    // Click import button
    const importBtn = page.locator('#btnImportTx');
    await expect(importBtn).toBeVisible();
    await importBtn.click();
    
    // Wait for import to complete
    await page.waitForTimeout(2000);
    
    // Check import result message
    const importResult = page.locator('#importResult');
    await expect(importResult).toContainText('Imported', { timeout: 5000 });
    
    // Navigate to dashboard and verify data appears
    await navigateToPage(page, '/dashboard');
    
    // Check that KPIs show values (not just "--")
    const savingsRate = await page.locator('#kpiSavingsRate').textContent();
    expect(savingsRate).not.toBe('--');
  });

  test('should persist imports and render charts for positive-only amounts', async ({ page }) => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const csvContent = `date,description,amount,account,category
${iso},Coffee,8.5,Checking,Food
${iso},Groceries,54.2,Checking,Groceries
${iso},Rent,1200,Checking,Rent`;

    await fillFileInput(page, 'txCsvFile', csvContent, 'positive.csv');
    await page.waitForTimeout(1500);

    await page.locator('#btnImportTx').click();
    await page.waitForTimeout(1500);

    await navigateToPage(page, '/dashboard');

    const pieSlices = await page.locator('#expensePie svg path').count();
    expect(pieSlices).toBeGreaterThan(0);

    await navigateToPage(page, '/cashflow');
    const flowRects = await page.locator('#flowSankey svg rect').count();
    expect(flowRects).toBeGreaterThan(0);

    await navigateToPage(page, '/connect');
    await navigateToPage(page, '/dashboard');
    const pieSlicesAfterNav = await page.locator('#expensePie svg path').count();
    expect(pieSlicesAfterNav).toBeGreaterThan(0);
  });

  test('should upload income CSV', async ({ page }) => {
    const csvContent = `date,description,amount
2025-01-15,Parents,550
2025-02-15,Parents,550`;

    // Jump to Accounts & income step (upload/map are required, so mark them complete for this test)
    await page.evaluate(() => {
      localStorage.setItem(
        'budgetsimple:onboarding',
        JSON.stringify({
          currentStep: 'accounts',
          completed: { upload: true, map: true },
          skipped: {}
        })
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-step="accounts"]:not([hidden])', { timeout: 10000 });
    
    const fileInput = page.locator('#incomeCsvFile');
    await fillFileInput(page, 'incomeCsvFile', csvContent, 'income.csv');
    
    await page.waitForTimeout(2000);
    
    // Check that mapping wrap appears
    const mappingWrap = page.locator('#incomeMappingWrap');
    await expect(mappingWrap).toBeVisible({ timeout: 5000 });
    
    // Check file note
    const fileNote = page.locator('#incomeFileNote');
    await expect(fileNote).toContainText('income.csv', { timeout: 3000 });
  });

  test('should import income after mapping', async ({ page }) => {
    const csvContent = `date,description,amount
2025-01-15,Parents,550
2025-02-15,Parents,550`;

    await page.evaluate(() => {
      localStorage.setItem(
        'budgetsimple:onboarding',
        JSON.stringify({
          currentStep: 'accounts',
          completed: { upload: true, map: true },
          skipped: {}
        })
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-step="accounts"]:not([hidden])', { timeout: 10000 });
    
    await fillFileInput(page, 'incomeCsvFile', csvContent);
    await page.waitForTimeout(2000);
    
    // Click import button
    const importBtn = page.locator('#btnImportIncome');
    await expect(importBtn).toBeVisible();
    await importBtn.click();
    
    await page.waitForTimeout(2000);
    
    // Check import result
    const importResult = page.locator('#incomeImportResult');
    await expect(importResult).toContainText('Imported', { timeout: 5000 });
    
    // Verify income appears in table
    const incomeTable = page.locator('#incomeTable');
    await expect(incomeTable).toBeVisible();
    
    // Check that table has data rows
    const rows = incomeTable.locator('tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(1); // Header + data rows
  });

  test('should handle CSV with different delimiters', async ({ page }) => {
    // Test semicolon delimiter
    const csvContent = `date;description;amount;account
2025-01-01;Paycheck;3200;Checking
2025-01-02;Rent;-1400;Checking`;

    await fillFileInput(page, 'txCsvFile', csvContent);
    await page.waitForTimeout(2000);
    
    // Should still process the file
    const mappingPanel = page.locator('#mappingPanel');
    await expect(mappingPanel).toBeVisible({ timeout: 5000 });
  });

  test('should compute KPIs and chart categories from imported data', async ({ page }) => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const csvContent = `date,description,amount,account,category
${iso},Paycheck,3000,Checking,Income
${iso},Groceries,-120,Checking,Groceries
${iso},Dining,-80,Checking,Dining
${iso},Transport,-40,Checking,Transport
${iso},Utilities,-60,Checking,Utilities
${iso},Rent,-1000,Checking,Rent
${iso},Investing,-200,Checking,Investments`;

    await fillFileInput(page, 'txCsvFile', csvContent, 'kpi.csv');
    await page.waitForTimeout(1500);
    await page.locator('#btnImportTx').click();
    await page.waitForTimeout(1500);

    await navigateToPage(page, '/dashboard');

    const totalIncome = await page.locator('#kpiTotalIncome').textContent();
    const totalExpenses = await page.locator('#kpiTotalExpenses').textContent();
    const savingsRate = await page.locator('#kpiSavingsRate').textContent();
    const runway = await page.locator('#kpiRunway').textContent();

    expect(totalIncome || '').toContain('$');
    expect(totalExpenses || '').toContain('$');
    expect(savingsRate || '').toContain('%');
    expect(runway || '').toMatch(/mo|--/);

    const pieSlices = await page.locator('#expensePie svg path').count();
    expect(pieSlices).toBeGreaterThan(0);

    await navigateToPage(page, '/plan');
    await page.selectOption('#budgetCategory', { label: 'Groceries' });
    await page.fill('#budgetAmount', '200');
    await page.locator('#budgetForm button[type="submit"]').click();
    await page.waitForTimeout(500);

    await navigateToPage(page, '/dashboard');
    await expect(page.locator('#budgetList')).toContainText('Groceries');

    await navigateToPage(page, '/cashflow');
    const flowPaths = await page.locator('#flowSankey svg path').count();
    expect(flowPaths).toBeGreaterThan(0);
  });

  test('should respect range preset in MoM chart', async ({ page }) => {
    const now = new Date();
    const toLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const current = new Date(now.getFullYear(), now.getMonth(), 5);
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 5);
    const currentIso = toLocalISO(current);
    const previousIso = toLocalISO(previous);
    const csvContent = `date,description,amount,account,category
${currentIso},Groceries,-45,Checking,Groceries
${previousIso},Dining,-30,Checking,Dining
${currentIso},Rent,-900,Checking,Rent`;

    await fillFileInput(page, 'txCsvFile', csvContent, 'range.csv');
    await page.waitForTimeout(1500);
    await page.locator('#btnImportTx').click();
    await page.waitForTimeout(1500);

    await navigateToPage(page, '/dashboard');

    await page.click('#btnOpenRange');
    await page.selectOption('#rangePreset', '12m');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('budgetsimple:v1');
      return raw && JSON.parse(raw).settings.defaultRangePreset === '12m';
    });

    const allMonths = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('#momChart [data-segment="stacked-bar"]'))
        .map((el) => el.getAttribute('data-series-label') || '')
        .filter(Boolean);
      return Array.from(new Set(labels));
    });
    expect(allMonths.length).toBeGreaterThan(1);

    const monthStart = toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = toLocalISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    await page.selectOption('#rangePreset', 'custom');
    await page.fill('#rangeFrom', monthStart);
    await page.fill('#rangeTo', monthEnd);
    await page.click('#applyCustomRange');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('budgetsimple:v1');
      return raw && JSON.parse(raw).settings.defaultRangePreset === 'custom';
    });

    const monthOnly = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('#momChart [data-segment="stacked-bar"]'))
        .map((el) => el.getAttribute('data-series-label') || '')
        .filter(Boolean);
      return Array.from(new Set(labels));
    });
    expect(monthOnly.length).toBe(1);
  });

  test('should include all categories in expense pie', async ({ page }) => {
    const today = new Date();
    const toLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const thisMonth = toLocalISO(new Date(today.getFullYear(), today.getMonth(), 10));
    const lastMonth = toLocalISO(new Date(today.getFullYear(), today.getMonth() - 1, 10));
    const csvContent = `date,description,amount,account,category
${thisMonth},Groceries,-45,Checking,Groceries
${thisMonth},Dining,-30,Checking,Eating out
${thisMonth},Transit,-12,Checking,Transportation
${thisMonth},Coffee,-6,Checking,Coffee
${lastMonth},Subscriptions,-15,Checking,Subscriptions
${lastMonth},Movies,-18,Checking,Entertainment`;

    await fillFileInput(page, 'txCsvFile', csvContent, 'categories.csv');
    await page.waitForTimeout(1500);
    await page.locator('#btnImportTx').click();
    await page.waitForTimeout(1500);

    await navigateToPage(page, '/dashboard');
    await page.click('#btnOpenRange');
    await page.selectOption('#rangePreset', 'all');
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('budgetsimple:v1');
      return raw && JSON.parse(raw).settings.defaultRangePreset === 'all';
    });

    const pieSlices = await page.locator('#expensePie svg path').count();
    expect(pieSlices).toBeGreaterThanOrEqual(6);
  });
});




