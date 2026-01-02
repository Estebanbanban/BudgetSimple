# Product Requirements Document (PRD) — Budgetsimple MVP

**Author:** Estebanronsin  
**Date:** 2025-01-XX  
**Scope:** MVP Golden Path - Single linear walkthrough demonstrating core value in 5 minutes  
**Version:** MVP 1.0

## 1) Executive Summary

Budgetsimple MVP is a FIRE-oriented personal finance tracker focused on **one golden path**: Import CSV → See monthly overview → Understand what changed → Review subscriptions → Track milestones → Get actionable insights.

The MVP is **local-first by default** (data stays on device), supports multi-currency, and delivers immediate value through a single, linear walkthrough. No branching, no complex navigation—just one path that demonstrates the core value proposition.

## 2) Goals (MVP Optimizes For)

1. **Single Golden Path**: One linear walkthrough that can be demoed in 5 minutes
2. **Immediate Value**: Users see insights within minutes of importing data
3. **Actionable Insights**: Every feature leads to a clear action
4. **Data Foundation First**: Get transactions in, then build insights on top
5. **Trust Through Transparency**: Every number can be explained via drilldowns

## 3) Non-Goals (MVP)

- Multi-user features or social sharing
- Complex envelope/goal systems (simplified to category budgets)
- External benchmark comparisons (rent benchmarks paused)
- Investment account connections (manual entries only)
- Advanced portfolio analytics
- Uncertainty visualization or confidence bands
- Multi-account aggregation (single user, single workspace)

## 4) Personas

- **FIRE Builder (primary):** Wants to understand spending, track savings rate, identify subscriptions, and see progress toward goals. Hates spreadsheet overhead.
- **New User (secondary):** Needs simple onboarding, clear dashboard, and immediate value from first import.

## 5) The Golden Path (MVP Demo Script)

### Step 1: Import CSV ✅
- User uploads transaction CSV
- Maps columns once (date, amount, merchant, category)
- Imports transactions
- **Location:** `/connect` page

### Step 2: See "This month overview" ✅
- Dashboard shows current month summary
- Income, expenses, savings rate
- Key metrics at a glance
- **Location:** `/dashboard` (landing page)

### Step 3: See "What changed vs last month?" 🚧 (build next)
- Month-over-month comparison
- Drivers of change (which categories increased/decreased)
- Clear explanations with transaction drilldowns
- **Location:** Dashboard "What Changed" panel

### Step 4: See "Recurring subscriptions detected" ✅
- Subscription detection runs automatically
- Shows detected subscriptions with confidence scores
- User can confirm/reject/adjust
- **Location:** `/subscriptions` page + dashboard widget

### Step 5: See "Next milestone progress + ETA" 🚧 (build after data foundation)
- Milestone tracking (e.g., "Save $10K emergency fund")
- Progress visualization
- Time to goal estimates based on current pace
- **Location:** Dashboard or `/plan` (simplified)

### Step 6: Get 1–3 actionable cards ✅
- Insight cards on dashboard
- Actionable recommendations (e.g., "Reduce dining spend by $200/month")
- Based on data analysis
- **Location:** Dashboard action items panel

## 6) Information Architecture (MVP)

### 6.1 Dashboard (Home)
**Purpose:** Immediate overview and entry point to all features

**Must Include:**
- Monthly summary cards: Income, Expenses, Savings Rate
- "What Changed" panel: Month-over-month comparison with drivers
- Subscription widget: Total monthly subscriptions
- Milestone progress: Next goal with ETA
- Action items: 1-3 actionable insights
- Expense category breakdown (pie chart)
- Month-over-month chart (income vs expenses)
- Cashflow map link (visual flow diagram)

### 6.2 Connect / Import
**Purpose:** Get data into the system

**Must Include:**
- CSV upload with column mapping
- Data validation and preview
- Import confirmation
- Basic data health checks

### 6.3 Subscriptions
**Purpose:** Review and manage recurring subscriptions

**Must Include:**
- Detected subscription candidates
- Review/confirm/reject workflow
- Subscription summary (total monthly spend)
- Transaction history per subscription

### 6.4 Plan
**Purpose:** Set budgets and track milestones

**Must Include:**
- Category budgets (monthly targets)
- Milestone management (create/edit/delete)
- Milestone progress tracking
- ETA calculations

### 6.5 Cashflow Map
**Purpose:** Visual understanding of money flow

**Must Include:**
- Sankey diagram: Income → Expenses → Savings
- Interactive nodes (click to drilldown)
- Transaction lists per node
- Summary narratives

### 6.6 Settings
**Purpose:** Minimal configuration

**Must Include:**
- Display currency selection
- Basic preferences

## 7) Core Data Model (MVP)

- **User** (auth via Supabase)
- **Transaction** (date, amount, currency, merchant, description, category, type: income/expense)
- **Category** (name, type: expense/income, budget target)
- **Subscription** (merchant, monthly amount, frequency, status: pending/confirmed/rejected)
- **Milestone** (name, target amount, current progress, target date, ETA)
- **Budget** (category_id, monthly_target)

## 8) Functional Requirements (MVP)

### FR-1: CSV Import (MVP-critical)
- Users can upload CSV files
- Column mapping interface (date, amount, merchant, category)
- Data validation and preview
- Import transactions into local storage (IndexedDB) or Supabase
- Handle multi-currency transactions

### FR-2: Monthly Summary Dashboard (MVP-critical)
- Display current month income, expenses, savings rate
- Calculate savings rate: (Income - Expenses) / Income
- Show expense breakdown by category
- Month-over-month comparison chart
- Empty states when no data

### FR-3: "What Changed" Analysis (MVP-critical)
- Compare current month vs previous month
- Identify drivers of change (top categories that increased/decreased)
- Show percentage and absolute changes
- Link to transaction drilldowns
- Explain why numbers changed

### FR-4: Subscription Detection (MVP-critical)
- Automatically detect recurring transactions
- Use multiple signals: category, merchant patterns, known services
- Show confidence scores
- Allow user to confirm/reject/adjust
- Summarize total monthly subscription spend

### FR-5: Milestones & Progress Tracking (MVP-critical)
- Create/edit/delete milestones
- Track progress toward target amount
- Calculate ETA based on current savings pace
- Show progress visualization
- Display on dashboard

### FR-6: Actionable Insight Cards (MVP-critical)
- Generate 1-3 actionable recommendations
- Based on spending patterns, subscriptions, milestones
- Link to relevant drilldowns
- Update dynamically as data changes

### FR-7: Cashflow Map (MVP-critical)
- Visualize income → expenses → savings flow
- Interactive Sankey diagram
- Click nodes to see transactions
- Support drilldowns from dashboard KPIs

### FR-8: Category Budgets (MVP-critical)
- Set monthly budget targets per category
- Track spending vs budget
- Show over/under budget status
- Simple progress indicators

## 9) Non-Functional Requirements (MVP)

### NFR-1: Performance
- Dashboard loads in < 2 seconds with typical dataset
- CSV import processes in < 5 seconds for 1000 transactions
- Smooth interactions (60fps for charts)

### NFR-2: Data Privacy
- Local-first by default (IndexedDB)
- Optional cloud sync (Supabase) with user consent
- No data sharing between users
- Clear privacy messaging

### NFR-3: Usability
- Single linear flow (no branching)
- Clear empty states
- Helpful error messages
- Mobile-responsive (desktop-first)

### NFR-4: Reliability
- Graceful handling of missing data
- Validation prevents bad imports
- Clear error recovery paths

## 10) Out of Scope (MVP)

- Multi-user features
- Social/community features
- Complex envelope/goal systems (simplified to milestones)
- Rent/home benchmarks
- Investment account connections
- Advanced portfolio analytics
- Tax optimization
- Rebalancing tools
- Uncertainty visualization

## 11) Success Metrics (MVP)

- **Time to first insight:** < 5 minutes from import to seeing dashboard
- **Golden path completion:** 90% of users complete full walkthrough
- **Subscription detection accuracy:** > 80% of confirmed subscriptions are correctly detected
- **User retention:** 70% of users return within 7 days
- **Action item relevance:** 60% of users act on at least one insight card

## 12) Future Enhancements (Post-MVP)

- Multi-account aggregation
- Investment account connections
- Rent benchmarks
- Complex envelope system
- Social features
- Advanced analytics
- Mobile app
- Automated categorization
- Bill reminders

