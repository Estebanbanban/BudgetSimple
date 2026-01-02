# MVP Golden Path

## Vision
**ONE linear walkthrough** - no branching, no complex navigation. A single path that demonstrates the core value.

## The Golden Path (MVP Demo Script)

1. **Import CSV** ✅
   - User uploads transaction CSV
   - Maps columns once
   - Imports transactions

2. **See "This month overview"** ✅
   - Dashboard shows current month summary
   - Income, expenses, savings rate
   - Key metrics at a glance

3. **See "What changed vs last month?"** ✅ (build next)
   - Month-over-month comparison
   - Drivers of change
   - Clear explanations

4. **See "Recurring subscriptions detected"** ✅
   - Subscription detection runs automatically
   - Shows detected subscriptions
   - User can confirm/reject

5. **See "Next milestone progress + ETA"** ✅ (build after data foundation)
   - Milestone tracking
   - Progress visualization
   - Time to goal estimates

6. **Get 1–3 actionable cards** ✅
   - Insight cards on dashboard
   - Actionable recommendations
   - Based on data analysis

## KEEP (Core MVP Features)

✅ **CSV Import** - Transaction import with column mapping
✅ **Transactions list/filter** - Minimal transaction viewing
✅ **Monthly summary** - Income/expense/savings rate
✅ **"What Changed" drivers** - Month-over-month analysis (build next)
✅ **Subscriptions detection** - Automatic recurring subscription detection
✅ **Milestones projection** - Goal tracking with ETA (build after data foundation)
✅ **Insight cards** - Thin layer over the above features

## PAUSED (Not in MVP)

❌ **Envelope savings goals** - Complex goal system (pause)
❌ **Complex budget/envelope system** - Keep only "budget target per category"
❌ **Rent/home benchmark** - External benchmark comparisons (pause)
❌ **Investment account connections** - External integrations (pause)
❌ **Anything "social/community"** - Social features (pause)

## Implementation Status

### ✅ Completed
- CSV Import with column mapping
- Dashboard with monthly summary
- Subscription detection (re-enabled)
- Basic transaction filtering
- Insight cards framework

### 🚧 In Progress / Next
- "What Changed" month-over-month analysis
- Milestones projection UI
- Enhanced insight cards

### ❌ Paused
- Envelope system (code preserved)
- Rent benchmark (code preserved)
- Investment connections (basic investing kept)
- Social features (none implemented)

## Navigation Structure (MVP)

**Single path flow:**
1. Dashboard (landing page)
2. Connect/Import (CSV upload)
3. Subscriptions (review detected)
4. Plan (category budgets only - simplified)
5. Settings (minimal)

**Removed from navigation:**
- Investing (keep page but remove from main nav - it's not in golden path)
- Complex envelope/goal features

## Key Principles

1. **No branching** - Linear flow only
2. **One walkthrough** - Can demo entire product in 5 minutes
3. **Data foundation first** - Get transactions in, then build insights
4. **Actionable insights** - Every feature should lead to an action
5. **Progressive disclosure** - Show complexity only when needed

