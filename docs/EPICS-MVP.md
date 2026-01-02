# Budgetsimple MVP - Epic Breakdown

**Version:** MVP 1.0  
**Focus:** Golden Path - Single linear walkthrough  
**Last Updated:** 2025-01-XX

## Overview

This document provides the epic and story breakdown for Budgetsimple MVP, focused on delivering the golden path walkthrough. Each epic directly supports one or more steps in the golden path.

## The Golden Path

1. **Import CSV** ✅
2. **See "This month overview"** ✅
3. **See "What changed vs last month?"** 🚧
4. **See "Recurring subscriptions detected"** ✅
5. **See "Next milestone progress + ETA"** 🚧
6. **Get 1–3 actionable cards** ✅

## Epic List (MVP)

### Epic 1: Data Foundation & Import ✅
**Golden Path Step:** Import CSV  
**Status:** Complete  
**Stories:** CSV import, column mapping, data validation

### Epic 2: Monthly Overview Dashboard ✅
**Golden Path Step:** See "This month overview"  
**Status:** Complete  
**Stories:** Dashboard KPIs, monthly summary, expense breakdown, MoM chart

### Epic 3: "What Changed" Month-over-Month Analysis 🚧
**Golden Path Step:** See "What changed vs last month?"  
**Status:** In Progress  
**Stories:** MoM comparison, change drivers, explanations

### Epic 4: Subscription Detection ✅
**Golden Path Step:** See "Recurring subscriptions detected"  
**Status:** Complete  
**Stories:** Detection algorithm, review workflow, summaries

### Epic 5: Milestones & Progress Tracking 🚧
**Golden Path Step:** See "Next milestone progress + ETA"  
**Status:** In Progress  
**Stories:** Milestone management, progress tracking, ETA calculations

### Epic 6: Actionable Insight Cards ✅
**Golden Path Step:** Get 1–3 actionable cards  
**Status:** Complete (needs enhancement)  
**Stories:** Insight generation, action items panel

### Epic 7: Cashflow Map ✅
**Supporting Feature:** Visual understanding  
**Status:** Complete  
**Stories:** Sankey diagram, interactive nodes, drilldowns

### Epic 8: Category Budgets ✅
**Supporting Feature:** Budget tracking  
**Status:** Complete  
**Stories:** Budget CRUD, progress tracking

## Epic 1: Data Foundation & Import ✅

**Goal:** Users can import transaction data via CSV and see it in the system.

### Story 1.1: CSV Import with Column Mapping ✅
**Status:** Complete  
**Acceptance Criteria:**
- User can upload CSV file
- Column mapping interface (date, amount, merchant, category)
- Preview before import
- Validation and error handling
- Transactions stored in IndexedDB or Supabase

### Story 1.2: Data Validation & Health Checks ✅
**Status:** Complete  
**Acceptance Criteria:**
- Validate required fields (date, amount)
- Detect duplicates
- Handle missing data gracefully
- Show data health summary

## Epic 2: Monthly Overview Dashboard ✅

**Goal:** Users see immediate overview of current month finances.

### Story 2.1: Core Dashboard KPIs ✅
**Status:** Complete  
**Acceptance Criteria:**
- Income card (current month)
- Expenses card (current month)
- Savings rate card (calculated)
- Net worth card (if data available)
- Empty states when no data

### Story 2.2: Expense Category Breakdown ✅
**Status:** Complete  
**Acceptance Criteria:**
- Pie chart showing top categories
- Percentage and absolute amounts
- Click to drilldown
- Empty state handling

### Story 2.3: Month-over-Month Chart ✅
**Status:** Complete  
**Acceptance Criteria:**
- Bar chart comparing current vs previous month
- Income and expenses side-by-side
- Category breakdown option
- Clear labels and legends

## Epic 3: "What Changed" Month-over-Month Analysis 🚧

**Goal:** Users understand what changed between months and why.

### Story 3.1: MoM Comparison Calculation
**Status:** To Build  
**Acceptance Criteria:**
- Compare current month vs previous month
- Calculate absolute and percentage changes
- Identify top drivers (categories with largest changes)
- Handle edge cases (first month, missing data)

### Story 3.2: "What Changed" Panel UI
**Status:** To Build  
**Acceptance Criteria:**
- Display on dashboard (prominent position)
- Show top 3-5 changes (categories)
- Color coding (green for decreases, red for increases)
- Link to category drilldowns
- Clear explanations ("Dining increased by $200 (25%)")

### Story 3.3: Change Driver Explanations
**Status:** To Build  
**Acceptance Criteria:**
- Explain why each category changed
- Show contributing transactions
- Highlight unusual spikes
- Link to transaction list

## Epic 4: Subscription Detection ✅

**Goal:** Users can identify and manage recurring subscriptions.

### Story 4.1: Subscription Detection Algorithm ✅
**Status:** Complete  
**Acceptance Criteria:**
- Detect recurring patterns (monthly, weekly, etc.)
- Use multiple signals (category, merchant, known services)
- Calculate confidence scores
- Handle edge cases (billing drift, amount variance)

### Story 4.2: Subscription Review Workflow ✅
**Status:** Complete  
**Acceptance Criteria:**
- Show detected candidates
- Allow confirm/reject/adjust
- Edit merchant name and amount
- Store confirmed subscriptions

### Story 4.3: Subscription Summaries ✅
**Status:** Complete  
**Acceptance Criteria:**
- Total monthly subscription spend
- Breakdown by merchant
- Transaction history per subscription
- Dashboard widget

## Epic 5: Milestones & Progress Tracking 🚧

**Goal:** Users can set goals and track progress with ETA.

### Story 5.1: Milestone Management
**Status:** To Build  
**Acceptance Criteria:**
- Create/edit/delete milestones
- Set target amount and optional target date
- Track current progress
- Store in IndexedDB or Supabase

### Story 5.2: Progress Calculation & ETA
**Status:** To Build  
**Acceptance Criteria:**
- Calculate progress percentage
- Compute ETA based on current savings pace
- Handle different milestone types (emergency fund, vacation, etc.)
- Show progress visualization

### Story 5.3: Milestone Dashboard Widget
**Status:** To Build  
**Acceptance Criteria:**
- Display next milestone on dashboard
- Show progress bar
- Display ETA
- Link to full milestone page

### Story 5.4: Milestone Projection Timeline
**Status:** To Build  
**Acceptance Criteria:**
- Visual timeline showing all milestones
- Progress indicators
- ETA dates
- Filter by status (active, completed)

## Epic 6: Actionable Insight Cards ✅

**Goal:** Users get 1-3 actionable recommendations.

### Story 6.1: Insight Generation Logic ✅
**Status:** Complete (needs enhancement)  
**Acceptance Criteria:**
- Generate insights from spending patterns
- Identify top spending categories
- Detect subscription opportunities
- Calculate savings potential

### Story 6.2: Action Items Panel ✅
**Status:** Complete  
**Acceptance Criteria:**
- Display 1-3 action items
- Clear, actionable language
- Link to relevant drilldowns
- Update dynamically

### Story 6.3: Enhanced Insight Cards 🚧
**Status:** To Enhance  
**Acceptance Criteria:**
- More sophisticated insight generation
- Personalized recommendations
- Priority scoring
- Context-aware suggestions

## Epic 7: Cashflow Map ✅

**Goal:** Users visualize money flow visually.

### Story 7.1: Sankey Diagram Visualization ✅
**Status:** Complete  
**Acceptance Criteria:**
- Render income → expenses → savings flow
- Proportional link widths
- Smooth curves
- Responsive design

### Story 7.2: Interactive Nodes ✅
**Status:** Complete  
**Acceptance Criteria:**
- Click nodes to see transactions
- Highlight selected nodes
- Filter dashboard from map
- Deep links from KPIs

### Story 7.3: Cashflow Drilldowns ✅
**Status:** Complete  
**Acceptance Criteria:**
- Transaction lists per node
- Totals reconcile to map
- Export capability
- Clear navigation

## Epic 8: Category Budgets ✅

**Goal:** Users set monthly targets and track progress.

### Story 8.1: Budget CRUD ✅
**Status:** Complete  
**Acceptance Criteria:**
- Create/edit/delete category budgets
- Set monthly targets
- Store in IndexedDB or Supabase
- Simple UI

### Story 8.2: Budget Progress Tracking ✅
**Status:** Complete  
**Acceptance Criteria:**
- Compare spending vs budget
- Show over/under status
- Progress indicators
- Dashboard integration

## Implementation Priority

### Phase 1: Foundation ✅
- Epic 1: Data Foundation
- Epic 2: Dashboard
- Epic 4: Subscriptions
- Epic 7: Cashflow Map
- Epic 8: Budgets

### Phase 2: Analysis 🚧 (Current)
- Epic 3: "What Changed" Analysis
- Epic 5: Milestones

### Phase 3: Enhancement 🚧
- Epic 6: Enhanced Insight Cards

## Paused Features (Not in MVP)

- Envelope savings goals (complex system)
- Rent/home benchmarks
- Investment account connections
- Multi-user features
- Social/community features

