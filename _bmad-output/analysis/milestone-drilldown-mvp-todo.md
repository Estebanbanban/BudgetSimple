# Milestone Drilldown MVP - Remaining Work

## Summary

**Status:** ~80% complete, 3 critical gaps for MVP

The milestone drilldown page is largely implemented but missing **3 high-priority features** from the MVP spec:

1. ✅ Scenario presets (Conservative/Base/Aggressive) in projection chart
2. ✅ Contribution mode selector UI (auto vs manual)
3. ✅ Time range selector (2y/5y/10y/until target)

---

## 🔴 HIGH PRIORITY - MVP Blockers

### 1. Scenario Presets in Projection Chart

**Current State:** Only shows base scenario (user inputs)

**Required:**
- Add 3 scenario curves:
  - **Conservative:** 4% return, -20% contribution
  - **Base:** User inputs (current behavior)
  - **Aggressive:** 9% return, +20% contribution
- Add scenario preset controls (compact, top-right of chart)
- Show all 3 lines on chart simultaneously

**Files to Modify:**
- `budgetsimple-web/src/components/milestone-graph.tsx`
- `budgetsimple-web/src/lib/milestone-projection.ts` (if needed)

**Implementation Notes:**
- `generateProjectionCurves()` already exists and may support multiple curves
- Need to calculate Conservative/Aggressive variants
- Add UI controls (buttons or segmented control)

---

### 2. Contribution Mode Selector UI

**Current State:** Mode exists in state but no UI to change it

**Required:**
- Radio buttons or segmented control: "Auto from cashflow" | "Manual fixed amount"
- When "Manual" selected, show input field for monthly contribution
- Save mode selection to config (already saves other settings)

**Files to Modify:**
- `budgetsimple-web/src/app/plan/milestone/[id]/page.tsx` (Section C, around line 762)

**Implementation Notes:**
- State already exists: `contributionMode` (line 45)
- Manual contribution state exists: `manualContribution` (line 48)
- Just needs UI controls and conditional rendering

---

### 3. Time Range Selector

**Current State:** Hard-coded to 120 months (10 years)

**Required:**
- Add selector: 2y / 5y / 10y / Until target
- Update projection to use selected range
- Recalculate curves when range changes

**Files to Modify:**
- `budgetsimple-web/src/components/milestone-graph.tsx`

**Implementation Notes:**
- `projectionYears` state exists (line 32) but no UI to change it
- "Until target" option should project until milestone target date
- Add compact selector in chart controls area

---

## 🟡 MEDIUM PRIORITY - MVP Quality

### 4. Breakdown Toggle in Chart UI

**Current State:** `showBreakdown` state exists but not exposed

**Required:**
- Add toggle button/switch in chart controls
- When enabled, show stacked area chart (Contributions vs Growth)
- Uses existing breakdown data in projection points

**Files to Modify:**
- `budgetsimple-web/src/components/milestone-graph.tsx`

---

### 5. Current Contribution Estimate Display

**Current State:** Calculated but not shown to user

**Required:**
- Display "Current: $X/mo (from transactions)" in Section C
- Show near contribution mode selector
- Helps user understand auto calculation

**Files to Modify:**
- `budgetsimple-web/src/app/plan/milestone/[id]/page.tsx` (Section C)

---

### 6. Driver Evidence Links (Simplified)

**Current State:** Drivers shown but no way to see details

**Required (MVP Simplified):**
- Add "View transactions" link to each driver
- Link to dashboard with appropriate filters (category, date range)
- Can skip expandable details for MVP

**Files to Modify:**
- `budgetsimple-web/src/app/plan/milestone/[id]/what-changed-section.tsx`

---

## ✅ Already Complete (No Work Needed)

- ✅ Header with status badge and actions
- ✅ At-a-glance tiles (4 tiles)
- ✅ Base projection chart (single scenario)
- ✅ Milestone markers and "Today" line
- ✅ Hover tooltips
- ✅ Assumptions inputs (net worth, return)
- ✅ Contribution history chart (6 months)
- ✅ Contribution insights (volatility, consistency)
- ✅ Levers panel (both tabs)
- ✅ Sensitivity analysis
- ✅ What changed section (drivers)
- ✅ Advice cards
- ✅ History section (basic)

---

## Implementation Order

### Sprint 1: MVP Completion
1. Scenario presets (3 curves + controls)
2. Contribution mode selector UI
3. Time range selector

### Sprint 2: Quality Improvements
4. Breakdown toggle
5. Current contribution display
6. Driver evidence links

---

## Testing Checklist

Once implemented, verify:

- [ ] All 3 scenario curves render on chart
- [ ] Scenario buttons/controls work
- [ ] Contribution mode switches correctly
- [ ] Manual contribution input appears/hides correctly
- [ ] Time range changes update projection
- [ ] Breakdown toggle shows/hides stacked view
- [ ] Current contribution is displayed
- [ ] Driver links navigate correctly

---

## Notes

- Most infrastructure is already in place
- Main work is adding UI controls and wiring them up
- State management patterns already established
- Config saving already works for other settings
- Projection engine already supports what we need

**Estimated Effort:**
- High priority items: 1-2 days
- Medium priority items: 1 day
- **Total: 2-3 days for MVP completion**

