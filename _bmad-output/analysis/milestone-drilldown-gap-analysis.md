# Milestone Drilldown Page - Gap Analysis

## Status: Based on Spec vs Current Implementation

**Date:** 2025-01-21  
**Context:** Comparing detailed UX spec for milestone drilldown page against current implementation and MVP requirements

---

## Executive Summary

The milestone drilldown page has **substantial implementation** (~80% complete) but is **missing several key MVP features** from the spec. Most critically missing: **scenario presets** (conservative/base/aggressive), **contribution mode selector in UI**, and **enhanced driver details with expandable evidence**.

---

## Section-by-Section Comparison

### ✅ Header (Sticky-ish, minimal) - **COMPLETE**

**Spec Requirements:**
- Left: Milestone name, subtitle (target + date), status badge with ETA explanation
- Right: Primary CTA (Edit), Secondary (Duplicate), Overflow (Delete)

**Current Status:** ✅ **Fully Implemented**
- Location: `budgetsimple-web/src/app/plan/milestone/[id]/page.tsx` (lines 356-493)
- Status badge shows: Ahead / On track / Behind / No data
- All actions (Edit, Duplicate, Delete) implemented
- ETA shown in subtitle

---

### ✅ Section A — "At a glance" (3–4 tiles) - **COMPLETE**

**Spec Requirements:**
- Current Net Worth: $X
- Progress: X% + $X remaining
- ETA (base): Month Year
- Required monthly (only if target date exists): $X/mo + gap vs current

**Current Status:** ✅ **Fully Implemented**
- Location: `budgetsimple-web/src/app/plan/milestone/[id]/page.tsx` (lines 495-638)
- All 4 tiles present
- Gap calculation shows amber/red when short, green when ahead
- Conditional rendering for required monthly tile

---

### ⚠️ Section B — Projection chart - **PARTIALLY COMPLETE**

**Spec Requirements:**
- 3 lines: Conservative / Base / Aggressive
- Milestone marker: horizontal line at target value
- "Today" marker
- "ETA" markers (dots where line crosses target)
- Hover tooltip shows value & date on each curve
- Controls (compact, top-right):
  - Scenario presets: Conservative (lower return/contribution), Base (inputs), Aggressive (higher return/contribution)
  - Toggle: Show breakdown (stacked area or two lines: Contributions vs Investment growth)
  - Time range: 2y / 5y / 10y / until target
- Empty states with CTAs

**Current Status:** ⚠️ **Partially Implemented**

**✅ Implemented:**
- Single projection curve (base scenario) - `milestone-graph.tsx`
- Milestone markers (horizontal lines + dots) - ✅
- "Today" marker (vertical line) - ✅
- Hover tooltips - ✅
- Empty states with CTAs - ✅
- Breakdown toggle exists in code but not exposed in UI

**❌ Missing:**
- **3 scenario curves** (Conservative/Base/Aggressive) - Currently only shows base
- **Scenario preset controls** - No UI for switching scenarios
- **Time range selector** - Hard-coded to 120 months (10 years)
- **Breakdown toggle in UI** - Code exists but not exposed (showBreakdown state unused in UI)

**Location:** `budgetsimple-web/src/components/milestone-graph.tsx`

**Gap Priority:** 🔴 **HIGH** - Scenario presets are explicitly in MVP spec

---

### ⚠️ Section C — Assumptions & Contribution Engine - **PARTIALLY COMPLETE**

**Spec Requirements:**
- Starting net worth (number input)
- Annual return (%) with default
- Contribution mode:
  - Auto from cashflow
  - Manual fixed amount
  - Custom rule (optional later): "X% of income"
- If Manual: Monthly contribution amount
- Current contribution estimate (from transactions)
- Contribution stability score (simple)
- "Last 6 months contributions" mini bar chart
- Insight callouts (shown only when applicable)

**Current Status:** ⚠️ **Partially Implemented**

**✅ Implemented:**
- Starting net worth input - ✅ (lines 763-815)
- Annual return input - ✅ (lines 817-862)
- Contribution mode exists in state (auto/manual) - ✅ (line 45)
- Current contribution estimate calculated - ✅ (lines 153-157)
- Last 6 months contributions mini bar chart - ✅ (lines 866-947)
- Contribution insights (volatility, best/worst month, consistency) - ✅ (lines 950-1074)

**❌ Missing:**
- **Contribution mode selector in UI** - State exists but no UI to switch between auto/manual
- **Manual contribution input** - No input field when mode is manual
- **Current contribution estimate display** - Calculated but not shown to user
- **Contribution stability score label** - Calculated (consistencyScore) but not clearly labeled as "Stable/Variable"

**Location:** `budgetsimple-web/src/app/plan/milestone/[id]/page.tsx` (lines 733-1075)

**Gap Priority:** 🟡 **MEDIUM** - Contribution mode UI is important for MVP

---

### ✅ Section D — "What should I change?" (levers) - **COMPLETE**

**Spec Requirements:**
- Tab 1: Hit target date
  - Required contribution to hit target date: $X/mo
  - Current contribution estimate: $Y/mo
  - Gap: +$Z/mo
  - Two big buttons: Set contribution, Move target date
  - "If you keep current pace: ETA is Month Year."
- Tab 2: Optimize faster
  - Sensitivity analysis:
    - "+$100/mo contributions → -X months"
    - "-$100/mo expenses → -X months"
    - "+$5,000 lump sum today → -X months"
    - "+1% return → -X months"
  - Each row has "Apply" action (optional)

**Current Status:** ✅ **Fully Implemented**
- Location: `budgetsimple-web/src/components/milestone-levers.tsx`
- Both tabs implemented
- All sensitivity analyses present
- Buttons for Set contribution and Move date work
- Missing: "+$5,000 lump sum" sensitivity (but has +$100/mo, -$100/mo, +1% return)
- Missing: "Apply" buttons (but not critical for MVP)

**Gap Priority:** 🟢 **LOW** - Minor enhancements

---

### ⚠️ Section E — "Why did my ETA change?" (drivers) - **PARTIALLY COMPLETE**

**Spec Requirements:**
- "Since last month: ETA changed by +X months"
- Drivers list (Top 3–5):
  - Rent +$X → reduced savings by $Y/mo
  - Income +$X → increased savings by $Y/mo
  - Eating out -$X → improved savings
- "View evidence" - Each driver can expand into:
  - Affected categories/merchants
  - Exact MoM delta amounts
  - Link to filtered transactions view

**Current Status:** ⚠️ **Partially Implemented**

**✅ Implemented:**
- ETA delta calculation and display - ✅
- Top 3 drivers list - ✅
- Category changes tracked - ✅
- Income changes tracked - ✅
- Basic impact description - ✅

**❌ Missing:**
- **"View evidence" expandable details** - Drivers are not expandable
- **Category/merchant breakdowns** - Only top-level categories shown
- **Links to filtered transactions** - No navigation to dashboard with filters
- **MoM delta details** - Basic changes shown but not detailed breakdowns

**Location:** `budgetsimple-web/src/app/plan/milestone/[id]/what-changed-section.tsx`

**Gap Priority:** 🟡 **MEDIUM** - Evidence expansion is valuable but not blocking MVP

---

### ✅ Section F — Advice cards - **COMPLETE**

**Spec Requirements:**
- Keep 1–3 cards max
- Each card: Title, Impact, Why (evidence), CTA
- Examples: Subscriptions, Groceries over budget, Spending spikes

**Current Status:** ✅ **Fully Implemented**
- Location: `budgetsimple-web/src/app/plan/milestone/[id]/advice-cards-section.tsx`
- Max 3 cards enforced
- All card types implemented: subscription, budget, lifestyle, spike
- CTAs link to appropriate pages
- Impact calculations present

**Gap Priority:** 🟢 **COMPLETE**

---

### ⚠️ Section G — Milestone history - **PARTIALLY COMPLETE**

**Spec Requirements:**
- Timeline of edits:
  - target changed
  - date changed
  - assumptions changed
  - contribution mode changed
- ETA history sparkline (optional, but powerful)

**Current Status:** ⚠️ **Partially Implemented**

**✅ Implemented:**
- Basic timeline (created/updated) - ✅
- ETA history sparkline (sample data) - ✅

**❌ Missing:**
- **Detailed change tracking** - Only shows created/updated, not specific changes
- **Real ETA history** - Uses sample data, not actual historical ETAs
- **Change type tracking** - No tracking of what specifically changed (target, date, assumptions, mode)

**Location:** `budgetsimple-web/src/app/plan/milestone/[id]/history-section.tsx`

**Gap Priority:** 🟢 **LOW** - MVP acceptable as-is (spec says "optional" for sparkline)

---

## MVP Requirements Checklist (from Spec)

From the spec's "MVP vs V2 boundaries" section:

- ✅ Header + status
- ✅ At-a-glance tiles
- ⚠️ Projection chart with 3 scenarios - **MISSING scenarios**
- ✅ Assumptions + contribution mode (state exists, UI missing)
- ✅ What should I change (hit date + optimize faster)
- ✅ Drivers (top 3)
- ✅ Advice cards (max 2-3)
- ✅ Table: contribution history (last 6 months)

---

## Critical Gaps for MVP Completion

### 🔴 HIGH PRIORITY (Blocking MVP)

1. **Scenario Presets in Projection Chart**
   - **What:** Add Conservative/Base/Aggressive scenario curves
   - **Where:** `budgetsimple-web/src/components/milestone-graph.tsx`
   - **How:** 
     - Conservative: lower return (4%), lower contribution (-20% of base)
     - Base: user inputs (current)
     - Aggressive: higher return (9%), higher contribution (+20% of base)
   - **UI:** Add compact controls (top-right of chart) with scenario buttons

2. **Contribution Mode Selector UI**
   - **What:** Add UI to switch between "Auto from cashflow" and "Manual fixed amount"
   - **Where:** `budgetsimple-web/src/app/plan/milestone/[id]/page.tsx` (Section C)
   - **How:** Add radio buttons or segmented control, show manual input when "Manual" selected

3. **Time Range Selector**
   - **What:** Add 2y / 5y / 10y / until target selector
   - **Where:** `budgetsimple-web/src/components/milestone-graph.tsx`
   - **How:** Add compact selector in chart controls, update `projectionYears` state

### 🟡 MEDIUM PRIORITY (Important for MVP Quality)

4. **Breakdown Toggle in Chart UI**
   - **What:** Expose the existing `showBreakdown` toggle
   - **Where:** `budgetsimple-web/src/components/milestone-graph.tsx`
   - **How:** Add toggle button, show stacked area or two lines when enabled

5. **Current Contribution Estimate Display**
   - **What:** Show the calculated contribution estimate to user
   - **Where:** Section C (Assumptions)
   - **How:** Display "Current: $X/mo (from transactions)" near contribution mode selector

6. **Driver Evidence Expansion (MVP Simplified)**
   - **What:** At minimum, add "View transactions" links
   - **Where:** `what-changed-section.tsx`
   - **How:** Add link to dashboard with pre-filtered view (can be simplified for MVP)

### 🟢 LOW PRIORITY (Nice to Have)

7. **Manual Contribution Input Field**
   - **What:** Input field when contribution mode is "Manual"
   - **Where:** Section C
   - **How:** Conditional input field, save to config

8. **Contribution Stability Score Label**
   - **What:** Add "Stable" / "Variable" label to consistency score
   - **Where:** Section C insights
   - **How:** Add threshold-based label (e.g., >80% = "Stable")

9. **Lump Sum Sensitivity Analysis**
   - **What:** Add "+$5,000 lump sum today → -X months" to levers
   - **Where:** `milestone-levers.tsx` (Tab 2)
   - **How:** Calculate one-time boost impact

10. **Enhanced History Tracking**
    - **What:** Track specific changes (target, date, assumptions)
    - **Where:** `history-section.tsx`
    - **How:** Store change log in milestone metadata or separate storage

---

## Implementation Recommendations

### Phase 1: MVP Completion (High Priority)
1. Scenario presets (3 curves)
2. Contribution mode selector UI
3. Time range selector

### Phase 2: MVP Enhancement (Medium Priority)
4. Breakdown toggle exposure
5. Current contribution display
6. Driver evidence links (simplified)

### Phase 3: Polish (Low Priority)
7-10. All remaining enhancements

---

## Technical Notes

### Scenario Calculations
The projection engine (`milestone-projection.ts`) already supports multiple curves via `generateProjectionCurves()`. Need to:
- Calculate Conservative: `annualReturn * 0.57` (≈4% from 7%), `monthlyContribution * 0.8`
- Calculate Aggressive: `annualReturn * 1.29` (≈9% from 7%), `monthlyContribution * 1.2`
- Pass all 3 to graph component

### Contribution Mode
State management exists, just needs UI:
- Radio buttons or segmented control
- Conditional rendering of manual input
- Save mode to config (already done for other settings)

### Time Range
Currently hard-coded to 120 months. Need:
- State for range selection
- Update `monthsToProject` in projection inputs
- Recalculate curves on change

---

## References

- **Spec:** User-provided detailed UX spec for milestone drilldown
- **Golden MVP:** `docs/MVP-GOLDEN-PATH.md`
- **Epic 5 Plan:** `docs/epic-5-milestones-projection-plan.md`
- **Current Implementation:** `budgetsimple-web/src/app/plan/milestone/[id]/page.tsx`
- **Components:** 
  - `milestone-graph.tsx`
  - `milestone-levers.tsx`
  - `what-changed-section.tsx`
  - `advice-cards-section.tsx`
  - `history-section.tsx`

