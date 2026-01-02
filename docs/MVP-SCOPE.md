# MVP Scope - Golden Path Focus

## Core Principle
**ONE linear walkthrough** - no branching, no complex navigation. A single path that demonstrates the core value in 5 minutes.

## The Golden Path (MVP Demo Script)

### 1. Import CSV ✅
- User uploads transaction CSV
- Maps columns once
- Imports transactions
- **Location:** `/connect` page

### 2. See "This month overview" ✅
- Dashboard shows current month summary
- Income, expenses, savings rate
- Key metrics at a glance
- **Location:** `/dashboard` (landing page)

### 3. See "What changed vs last month?" 🚧 (build next)
- Month-over-month comparison
- Drivers of change
- Clear explanations
- **Location:** Dashboard action items / "What Changed" panel

### 4. See "Recurring subscriptions detected" ✅
- Subscription detection runs automatically
- Shows detected subscriptions
- User can confirm/reject
- **Location:** `/subscriptions` page + dashboard widget

### 5. See "Next milestone progress + ETA" 🚧 (build after data foundation)
- Milestone tracking
- Progress visualization
- Time to goal estimates
- **Location:** Dashboard or `/plan` (simplified)

### 6. Get 1–3 actionable cards ✅
- Insight cards on dashboard
- Actionable recommendations
- Based on data analysis
- **Location:** Dashboard action items panel

## KEEP (Core MVP Features)

✅ **CSV Import** - Transaction import with column mapping
✅ **Transactions list/filter** - Minimal transaction viewing
✅ **Monthly summary** - Income/expense/savings rate
✅ **"What Changed" drivers** - Month-over-month analysis (build next)
✅ **Subscriptions detection** - Automatic recurring subscription detection
✅ **Milestones projection** - Goal tracking with ETA (build after data foundation)
✅ **Insight cards** - Thin layer over the above features
✅ **Category budgets** - Simple monthly targets per category (simplified from complex envelope system)

## PAUSED (Not in MVP)

❌ **Envelope savings goals** - Complex goal system (code preserved)
❌ **Complex budget/envelope system** - Simplified to category targets only
❌ **Rent/home benchmark** - External benchmark comparisons (code preserved)
❌ **Investment account connections** - External integrations (code preserved, manual entries kept)
❌ **Anything "social/community"** - Social features (none implemented)

## Navigation Structure (MVP)

### Active Navigation
1. **Dashboard** - Landing page, monthly overview
2. **Cashflow Map** - Visual flow diagram
3. **Plan** - Category budgets only (simplified)
4. **Connect / Import** - CSV import
5. **Subscriptions** - Review detected subscriptions
6. **Settings** - Minimal settings

### Removed from Navigation
- **Investing** - Page exists for manual entries but removed from nav (not in golden path)

## Implementation Status

### ✅ Completed & Active
- CSV Import with column mapping
- Dashboard with monthly summary
- Subscription detection (re-enabled)
- Basic transaction filtering
- Insight cards framework
- Category budgets (simplified)
- Cashflow map

### 🚧 Next to Build
- "What Changed" month-over-month analysis
- Milestones projection UI
- Enhanced insight cards with actionable recommendations

### ❌ Paused (Code Preserved)
- Envelope system
- Rent benchmark
- Investment connections UI
- Complex envelope projections

## Key Principles

1. **No branching** - Linear flow only
2. **One walkthrough** - Can demo entire product in 5 minutes
3. **Data foundation first** - Get transactions in, then build insights
4. **Actionable insights** - Every feature should lead to an action
5. **Progressive disclosure** - Show complexity only when needed
6. **Focus on value** - Remove anything that doesn't support the golden path

## Files Modified for MVP Scope

### Re-enabled
- `budgetsimple-api/routes/subscriptions.js` - Restored from git
- `budgetsimple-web/src/components/app-shell.tsx` - Re-added subscriptions nav
- `budgetsimple-web/src/app/dashboard/page.tsx` - Re-added subscription widget/panel
- `budgetsimple-web/src/lib/runtime.ts` - Re-enabled subscription rendering

### Paused (Commented Out)
- `budgetsimple-web/src/app/dashboard/page.tsx` - Rent benchmark panel
- `budgetsimple-web/src/app/plan/page.tsx` - Envelope sections
- `budgetsimple-web/src/app/investing/page.tsx` - Account connections UI
- `budgetsimple-web/src/components/app-shell.tsx` - Investing nav link
- `budgetsimple-web/src/lib/runtime.ts` - Rent benchmark rendering, envelope onboarding

### Simplified
- `budgetsimple-web/src/app/plan/page.tsx` - Focus on category budgets only

