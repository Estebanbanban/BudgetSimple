import { test, expect } from '@playwright/test';
import { clearAppData, navigateToPage, waitForAppReady } from './helpers';

test.describe('Manual Data Entry', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppData(page);
    await navigateToPage(page, '/dashboard');
  });

  test('should add income via quick add modal', async ({ page }) => {
    // Open quick add modal
    const quickAddBtn = page.locator('#btnQuickAdd');
    await quickAddBtn.click();
    
    const modal = page.locator('#quickAdd');
    await expect(modal).toBeVisible({ timeout: 2000 });
    
    // Fill income form
    const dateInput = page.locator('#qaIncomeDate');
    const sourceInput = page.locator('#qaIncomeSource');
    const amountInput = page.locator('#qaIncomeAmount');
    
    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);
    await sourceInput.fill('Job');
    await amountInput.fill('5000');
    
    // Submit
    const addBtn = page.locator('#qaAddIncome');
    await addBtn.click();
    
    // Wait for data to be saved and modal to close
    await page.waitForTimeout(1500);
    
    // Verify modal closes or data appears
    // Navigate to connect page to check income table
    await navigateToPage(page, '/connect');
    // Accounts/income panel is gated by onboarding steps; force it visible for this test
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
    
    // Scroll to income section
    const incomeTable = page.locator('#incomeTable');
    await incomeTable.scrollIntoViewIfNeeded();
    await expect(incomeTable).toBeVisible();
    
    // Check that income appears in table
    const tableContent = await incomeTable.textContent();
    expect(tableContent).toContain('Job');
    expect(tableContent).toContain('5,000'); // Formatted amount
  });

  test('should add expense via quick add modal', async ({ page }) => {
    // Open quick add modal
    await page.locator('#btnQuickAdd').click();
    
    const modal = page.locator('#quickAdd');
    await expect(modal).toBeVisible({ timeout: 2000 });
    
    // Fill expense form
    const today = new Date().toISOString().split('T')[0];
    await page.locator('#qaExpenseDate').fill(today);
    
    // Select category (should be populated)
    const categorySelect = page.locator('#qaExpenseCategory');
    await expect(categorySelect).toBeVisible();
    await categorySelect.selectOption('Groceries');
    
    await page.locator('#qaExpenseAmount').fill('100');
    await page.locator('#qaExpenseDesc').fill('Trader Joe\'s');
    await page.locator('#qaExpenseAccount').fill('Checking');
    
    // Submit
    await page.locator('#qaAddExpense').click();
    
    await page.waitForTimeout(1000);
    
    // Verify expense appears (check dashboard or transactions)
    // The dashboard should update to show the expense
    await waitForAppReady(page);
    
    // Check that expense pie chart updates
    const expensePie = page.locator('#expensePie');
    await expect(expensePie.locator('svg')).toHaveCount(1);
  });

  test('should add investment via quick add modal', async ({ page }) => {
    await page.locator('#btnQuickAdd').click();
    
    const modal = page.locator('#quickAdd');
    await expect(modal).toBeVisible({ timeout: 2000 });
    
    const today = new Date().toISOString().split('T')[0];
    await page.locator('#qaInvestDate').fill(today);
    
    const instrumentSelect = page.locator('#qaInvestInstrument');
    await expect(instrumentSelect).toBeVisible();
    await instrumentSelect.selectOption('ETF');
    
    await page.locator('#qaInvestAmount').fill('500');
    
    await page.locator('#qaAddInvest').click();
    
    await page.waitForTimeout(1000);
    
    // Navigate to investing page to verify
    await navigateToPage(page, '/investing');
    
    const investmentTable = page.locator('#investmentTable');
    await expect(investmentTable).toBeVisible();
    
    const tableContent = await investmentTable.textContent();
    expect(tableContent).toContain('ETF');
  });

  test('should add manual income in connect page', async ({ page }) => {
    await navigateToPage(page, '/connect');
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
    
    // Scroll to manual income section
    const incomeForm = page.locator('#manualIncomeForm');
    await incomeForm.scrollIntoViewIfNeeded();
    await expect(incomeForm).toBeVisible();
    
    // Fill form
    const today = new Date().toISOString().split('T')[0];
    await page.locator('#manualIncomeDate').fill(today);
    
    // Select source
    const sourceSelect = page.locator('#manualIncomeSourceSelect');
    await expect(sourceSelect).toBeVisible();
    await sourceSelect.selectOption('Salary');
    
    await page.locator('#manualIncomeAmount').fill('3000');
    
    // Submit form
    await incomeForm.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(1000);
    
    // Verify income appears in table
    const incomeTable = page.locator('#incomeTable');
    await expect(incomeTable).toBeVisible();
    
    const tableContent = await incomeTable.textContent();
    expect(tableContent).toContain('Salary');
    expect(tableContent).toContain('3,000');
  });

  test('should delete manual income in connect page', async ({ page }) => {
    await navigateToPage(page, '/connect');
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
    const today = new Date().toISOString().split('T')[0];

    await page.locator('#manualIncomeDate').fill(today);
    await page.locator('#manualIncomeSourceSelect').selectOption('Salary');
    await page.locator('#manualIncomeAmount').fill('2500');
    await page.locator('#manualIncomeForm button[type="submit"]').click();
    await page.waitForTimeout(1000);

    const incomeTable = page.locator('#incomeTable');
    await expect(incomeTable).toContainText('Salary');

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('button[data-income-action="remove"]').click();
    await expect(incomeTable).toContainText('No income yet');
  });

  test('should add account', async ({ page }) => {
    await navigateToPage(page, '/connect');
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
    
    // Click add account button
    const addAccountBtn = page.locator('#btnAddAccount');
    await addAccountBtn.click();
    
    // Modal should appear
    const modal = page.locator('#createAccountModal');
    await expect(modal).toBeVisible({ timeout: 2000 });
    
    // Fill form
    await page.locator('#createAccountName').fill('Savings Account');
    await page.locator('#createAccountKind').selectOption('savings');
    
    // Submit
    const form = page.locator('#createAccountForm');
    await form.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(1000);
    
    // Verify account appears in table
    // Wait for renderAll to complete
    await page.waitForTimeout(1500);
    
    const accountsTable = page.locator('#accountsConfirmTable');
    // Table should exist (may be in DOM even if parent is hidden)
    const tableExists = await accountsTable.count();
    expect(tableExists).toBeGreaterThan(0);
    
    // Check table content
    const tableContent = await accountsTable.textContent();
    expect(tableContent).toContain('Savings Account');
  });
});
