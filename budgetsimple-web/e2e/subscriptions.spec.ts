import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Subscription Detection Feature
 * 
 * Tests the complete subscription detection flow:
 * 1. Navigation to subscriptions page
 * 2. Running detection
 * 3. Reviewing candidates
 * 4. Confirming/rejecting subscriptions
 */

test.describe('Subscription Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to subscriptions page', async ({ page }) => {
    // Look for navigation link to subscriptions
    const subscriptionsLink = page.locator('a[href*="subscriptions"], button:has-text("Subscriptions")').first();
    
    if (await subscriptionsLink.isVisible()) {
      await subscriptionsLink.click();
      await page.waitForURL(/subscriptions/);
      await expect(page.locator('h1:has-text("Subscriptions")')).toBeVisible();
    } else {
      // Try direct navigation
      await page.goto('/subscriptions');
      await expect(page.locator('h1:has-text("Subscriptions")')).toBeVisible();
    }
  });

  test('should show detection UI when no candidates exist', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Should show message about no candidates
    await expect(page.locator('text=No pending subscription candidates')).toBeVisible();
    
    // Should show detect button
    await expect(page.locator('button:has-text("Detect Subscriptions")')).toBeVisible();
    
    // Should show date range selector
    await expect(page.locator('select')).toBeVisible();
  });

  test('should show API endpoint info when backend not connected', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Should show API endpoint info
    await expect(page.locator('text=API Endpoint')).toBeVisible();
    await expect(page.locator('text=http://localhost:3001')).toBeVisible();
  });

  test('should handle detection with no transactions', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Intercept the API call
    await page.route('**/api/subscriptions/detect', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // Return empty result
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [],
          metadata: {
            startDate: postData.startDate,
            endDate: postData.endDate,
            totalCandidates: 0,
            totalTransactions: 0,
            analysisDate: new Date().toISOString()
          }
        })
      });
    });

    // Click detect button
    await page.locator('button:has-text("Detect Subscriptions")').click();
    
    // Wait for detection to complete
    await page.waitForTimeout(2000);
    
    // Should show error message about no transactions
    await expect(page.locator('text=No transactions found')).toBeVisible();
  });

  test('should handle detection with transactions but no patterns', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Intercept the API call
    await page.route('**/api/subscriptions/detect', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [],
          metadata: {
            startDate: '2024-01-01',
            endDate: '2024-06-30',
            totalCandidates: 0,
            totalTransactions: 50, // Has transactions but no patterns
            analysisDate: new Date().toISOString()
          }
        })
      });
    });

    // Click detect button
    await page.locator('button:has-text("Detect Subscriptions")').click();
    
    // Wait for detection to complete
    await page.waitForTimeout(2000);
    
    // Should show message about no patterns
    await expect(page.locator('text=No subscription patterns detected')).toBeVisible();
    await expect(page.locator('text=Found 50 transactions')).toBeVisible();
  });

  test('should detect and display subscription candidates', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Mock successful detection with candidates
    await page.route('**/api/subscriptions/detect', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              id: 'sub-1',
              merchant: 'Netflix',
              categoryId: 'entertainment',
              estimatedMonthlyAmount: 15.99,
              frequency: 'monthly',
              firstDetectedDate: '2024-01-15',
              lastChargeDate: '2024-06-15',
              nextExpectedDate: '2024-07-15',
              confidenceScore: 0.95,
              contributingTransactionIds: ['tx-1', 'tx-2', 'tx-3'],
              occurrenceCount: 6,
              averageAmount: 15.99,
              variancePercentage: 0.01,
              signals: {
                recurrenceScore: 0.9,
                amountConsistencyScore: 0.95,
                keywordScore: 0.9,
                categoryScore: 0
              },
              detectionMethod: 'known_subscription',
              patternType: 'monthly',
              reason: 'Known subscription service (netflix); Strong recurring pattern (monthly, 0.90 consistency)',
              sampleTransactions: [
                { id: 'tx-1', date: '2024-01-15', amount: 15.99 },
                { id: 'tx-2', date: '2024-02-15', amount: 15.99 }
              ],
              status: 'pending'
            },
            {
              id: 'sub-2',
              merchant: 'Spotify',
              categoryId: 'entertainment',
              estimatedMonthlyAmount: 9.99,
              frequency: 'monthly',
              firstDetectedDate: '2024-02-01',
              lastChargeDate: '2024-06-01',
              nextExpectedDate: '2024-07-01',
              confidenceScore: 0.88,
              contributingTransactionIds: ['tx-4', 'tx-5'],
              occurrenceCount: 5,
              averageAmount: 9.99,
              variancePercentage: 0.02,
              signals: {
                recurrenceScore: 0.85,
                amountConsistencyScore: 0.9,
                keywordScore: 0.9,
                categoryScore: 0
              },
              detectionMethod: 'known_subscription',
              patternType: 'monthly',
              reason: 'Known subscription service (spotify); Strong recurring pattern (monthly, 0.85 consistency)',
              sampleTransactions: [
                { id: 'tx-4', date: '2024-02-01', amount: 9.99 }
              ],
              status: 'pending'
            }
          ],
          metadata: {
            startDate: '2024-01-01',
            endDate: '2024-06-30',
            totalCandidates: 2,
            totalTransactions: 100,
            analysisDate: new Date().toISOString()
          }
        })
      });
    });

    // Mock the candidates list endpoint
    await page.route('**/api/subscriptions/candidates*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              id: 'sub-1',
              merchant: 'Netflix',
              estimatedMonthlyAmount: 15.99,
              frequency: 'monthly',
              confidenceScore: 0.95,
              occurrenceCount: 6,
              averageAmount: 15.99,
              variancePercentage: 0.01,
              status: 'pending'
            },
            {
              id: 'sub-2',
              merchant: 'Spotify',
              estimatedMonthlyAmount: 9.99,
              frequency: 'monthly',
              confidenceScore: 0.88,
              occurrenceCount: 5,
              averageAmount: 9.99,
              variancePercentage: 0.02,
              status: 'pending'
            }
          ]
        })
      });
    });

    // Click detect button
    await page.locator('button:has-text("Detect Subscriptions")').click();
    
    // Wait for detection to complete
    await page.waitForTimeout(2000);
    
    // Should show success message
    await expect(page.locator('text=Successfully detected 2 subscription candidates')).toBeVisible();
    
    // Wait for candidates to load
    await page.waitForTimeout(1000);
    
    // Should show candidates table
    await expect(page.locator('text=Pending Candidates')).toBeVisible();
    await expect(page.locator('text=2 subscriptions detected')).toBeVisible();
    
    // Should show Netflix
    await expect(page.locator('text=Netflix')).toBeVisible();
    await expect(page.locator('text=$15.99')).toBeVisible();
    
    // Should show Spotify
    await expect(page.locator('text=Spotify')).toBeVisible();
    await expect(page.locator('text=$9.99')).toBeVisible();
  });

  test('should allow confirming a subscription', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Mock candidates list
    await page.route('**/api/subscriptions/candidates*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              id: 'sub-1',
              merchant: 'Netflix',
              estimatedMonthlyAmount: 15.99,
              frequency: 'monthly',
              confidenceScore: 0.95,
              occurrenceCount: 6,
              averageAmount: 15.99,
              variancePercentage: 0.01,
              status: 'pending'
            }
          ]
        })
      });
    });

    // Mock confirm endpoint
    let confirmCalled = false;
    await page.route('**/api/subscriptions/sub-1/confirm', async route => {
      confirmCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Reload to get candidates
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click confirm button
    const confirmButton = page.locator('button:has-text("Confirm")').first();
    await confirmButton.click();
    
    // Wait for API call
    await page.waitForTimeout(1000);
    
    // Verify confirm was called
    expect(confirmCalled).toBe(true);
  });

  test('should allow rejecting a subscription', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Mock candidates list
    await page.route('**/api/subscriptions/candidates*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              id: 'sub-1',
              merchant: 'Netflix',
              estimatedMonthlyAmount: 15.99,
              frequency: 'monthly',
              confidenceScore: 0.95,
              occurrenceCount: 6,
              averageAmount: 15.99,
              variancePercentage: 0.01,
              status: 'pending'
            }
          ]
        })
      });
    });

    // Mock reject endpoint
    let rejectCalled = false;
    await page.route('**/api/subscriptions/sub-1/reject', async route => {
      rejectCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Reload to get candidates
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click reject button
    const rejectButton = page.locator('button:has-text("Reject")').first();
    await rejectButton.click();
    
    // Wait for API call
    await page.waitForTimeout(1000);
    
    // Verify reject was called
    expect(rejectCalled).toBe(true);
  });

  test('should handle API connection errors gracefully', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Mock failed API call
    await page.route('**/api/subscriptions/detect', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Click detect button
    await page.locator('button:has-text("Detect Subscriptions")').click();
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Should show error message
    await expect(page.locator('text=Error')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Mock network failure
    await page.route('**/api/subscriptions/detect', route => route.abort());

    // Click detect button
    await page.locator('button:has-text("Detect Subscriptions")').click();
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Should show connection error
    await expect(page.locator('text=Cannot connect to backend API')).toBeVisible();
  });

  test('should allow changing date range', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.waitForLoadState('networkidle');

    // Find the date range selector
    const select = page.locator('select').first();
    await expect(select).toBeVisible();

    // Change to 12 months
    await select.selectOption('12');
    
    // Verify the value changed
    await expect(select).toHaveValue('12');
  });
});

