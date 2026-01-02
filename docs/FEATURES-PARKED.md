# Parked Features

This document tracks features that have been implemented but are currently disabled to focus on core MVP functionality.

## Subscription Detection Feature

**Status:** Parked (fully implemented, disabled from UI)

**Location:**
- Frontend: `budgetsimple-web/src/app/subscriptions/`, `budgetsimple-web/src/components/subscription-widget.tsx`
- Backend: `budgetsimple-api/routes/subscriptions.js`, `budgetsimple-api/lib/subscription-detection.js`
- Tests: `budgetsimple-web/e2e/subscriptions.spec.ts`

**What was disabled:**
- Navigation link to subscriptions page (app-shell.tsx)
- Subscription widget on dashboard (dashboard/page.tsx)
- Subscription panel on dashboard (dashboard/page.tsx)
- All subscription API routes (return 404)
- Subscription-related code in runtime.ts (commented out)

**What's preserved:**
- All code files remain intact
- Database schema remains (subscriptions, subscription_transactions tables)
- All tests remain
- Full implementation ready to re-enable

**To re-enable:**
1. Uncomment subscription navigation in `budgetsimple-web/src/components/app-shell.tsx`
2. Uncomment subscription widget in `budgetsimple-web/src/app/dashboard/page.tsx`
3. Uncomment subscription panel in `budgetsimple-web/src/app/dashboard/page.tsx`
4. Restore original routes in `budgetsimple-api/routes/subscriptions.js` (from git history)
5. Uncomment subscription-related functions in `budgetsimple-web/src/lib/runtime.ts`:
   - `renderSubscriptionsTable()`
   - Subscription detection logic
   - Subscription category handling
   - Subscription drilldown

**Git history:**
- Last commit with active subscription feature: `4ce5682` (before parking)
- Parking commit: (current)

**Reason for parking:**
Focus on core MVP features (dashboard, cashflow map, transaction import, basic budgeting) before adding advanced features like subscription detection.

