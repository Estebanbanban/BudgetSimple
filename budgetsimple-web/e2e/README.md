# E2E Tests with Playwright

This directory contains end-to-end (E2E) tests for the Budgetsimple application using Playwright.

## Test Structure

### Test Files

- **`subscriptions.spec.ts`** - Tests for subscription detection feature
  - Navigation to subscriptions page
  - Running detection
  - Reviewing candidates
  - Confirming/rejecting subscriptions
  - Error handling

- **`subscription-summary.spec.ts`** - Tests for subscription summary page
  - Displaying summary data
  - Handling empty states
  - API error handling

- **`dashboard-widgets.spec.ts`** - Tests for dashboard widgets
  - Subscription widget display
  - Navigation from widgets

- **`cashflow-map.spec.ts`** - Tests for cashflow map (Sankey diagram)
  - Page loading
  - Diagram rendering
  - Responsive behavior

- **`dashboard.spec.ts`** - Tests for dashboard features (existing)
- **`navigation.spec.ts`** - Tests for navigation (existing)
- **`csv-import.spec.ts`** - Tests for CSV import (existing)
- **`manual-entry.spec.ts`** - Tests for manual entry (existing)

## Running Tests

### Run all tests
```bash
cd budgetsimple-web
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test e2e/subscriptions.spec.ts
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

## Test Configuration

The Playwright configuration is in `playwright.config.ts`. It:
- Runs tests on Chromium by default
- Starts both frontend (port 3000) and backend (port 3001) servers automatically
- Uses HTML reporter for test results
- Retries failed tests on CI

## Writing New Tests

1. Create a new `.spec.ts` file in the `e2e/` directory
2. Import test utilities from `helpers.ts`
3. Use Playwright's page object model for better maintainability
4. Mock API calls when testing frontend behavior
5. Use data-testid attributes for reliable selectors

## Best Practices

1. **Use data-testid attributes** - More reliable than CSS selectors
2. **Mock API calls** - Test frontend behavior independently
3. **Clear app data** - Use `clearAppData()` helper before each test
4. **Wait for network idle** - Use `waitForLoadState('networkidle')` after navigation
5. **Use meaningful test descriptions** - Help identify failures quickly

## Debugging Failed Tests

1. Run tests in UI mode: `npm run test:e2e:ui`
2. Use `--headed` flag to see browser: `npm run test:e2e:headed`
3. Use `--debug` flag to step through tests
4. Check `playwright-report/` for detailed HTML reports
5. Check browser console logs in headed mode

## CI/CD Integration

Tests are configured to:
- Run in parallel (except on CI)
- Retry failed tests on CI (2 retries)
- Generate HTML reports
- Fail the build if `test.only` is left in code

