# Epic 3 Plan - Dashboard KPIs + Explain-This Drilldowns

This doc scopes Epic 3 and provides a working outline for stories and acceptance criteria. We will refine each story together before implementation.

## Goal
Deliver a trustworthy dashboard with core KPIs, clear charts, and cashflow-map explain views that reconcile every number back to transactions.

## Scope
- KPI cards: expenses, income, savings rate, runway, net worth (remove % invested).
- Core charts: expense category breakdown, MoM bar chart, daily spending.
- Explain this number: routes to Cashflow Map with highlighted nodes + savings breakdown.
- Action items panel: short, contextual recommendations tied to explain flow.
- Top categories/merchants include % of expenses + score (budget or benchmark-based).

## Non-Goals (for this epic)
- Investing connector ingestion (Epic 8).
- Cashflow map improvements (Epic 5).
- Envelope projections (Epic 6).
- Rent benchmarks (Epic 7).

## Story List (from epics.md)

### 3.1 Core Dashboard KPIs + Visualizations (Baseline)
**User Story**
As a user, I want a dashboard overview of my finances so that I can quickly understand my current status and trends.

**Acceptance Criteria (baseline)**
- Show income vs expenses (MoM), expense category breakdown, daily spending.
- Show savings rate (remove % invested card).
- Missing data does not break the rest of the dashboard.

**Open Questions**
- Default time range for each chart (month vs custom).
- KPI ordering and card layout on desktop vs mobile.
- Thresholds for empty state vs partial data.

### 3.2 Universal "Explain This Number" Drilldown
**User Story**
As a user, I want to click any KPI/chart and see an explain view integrated with the cashflow map so I can trust every number.

**Acceptance Criteria (baseline)**
- Explain routes to Cashflow Map page with relevant nodes highlighted/zoomed.
- Cashflow map shows contributing rows and filters used.
- Totals reconcile to the KPI total.
- Runway explain shows a runway projection chart (net worth minus monthly expenses if income stops).

**Open Questions**
- Drilldown format: modal vs side panel vs inline panel.
- Export behavior for drilldown data (CSV?).

### 3.3 Action Items Panel (Insight -> Recommendation)
**User Story**
As a user, I want a short list of actionable insights so the app helps me decide what to change.

**Acceptance Criteria (baseline)**
- Show action items after at least 1 month of data.
- Each item links to a drilldown.

**Open Questions**
- Top 3 default items (category spike, subscriptions total, envelope behind pace).
- Priority/ordering rules when multiple insights exist.

## Testing Plan (draft)
- Unit: KPI and chart aggregation logic.
- Integration: drilldown reconciles to KPI total (Given/When/Then).
- E2E: dashboard renders with sample data and drilldowns open reliably.

## Decisions Needed (from you)
1. Default dashboard range: Monthly.
2. Drilldown UI: Cashflow map deep-link highlight.
3. Action items: 3 max.

## Decision Log
- 2025-01-xx: Default range set to Monthly.
- 2025-01-xx: Drilldowns route to Cashflow Map with highlights.
- 2025-01-xx: Action items capped at 3.
