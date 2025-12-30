---
stepsCompleted: [1]
inputDocuments:
  - "_bmad-output/analysis/product-brief-Budgetsimple-2025-12-20.md"
  - "_bmad-output/analysis/research/technical-canada-france-brokerage-rent-fx-research-2025-12-20T155518Z.md"
  - "_bmad-output/analysis/brainstorming-session-2025-12-20T154326Z.md"
  - "_bmad-output/analysis/prd-Budgetsimple-2025-12-20.md"
  - "_bmad-output/project-planning-artifacts/prd.md"
  - "_bmad-output/index.md"
workflowType: "ux-design"
lastStep: 1
project_name: "Budgetsimple"
user_name: "Estebanronsin"
date: "2025-12-20"
---

# UX Design Specification Budgetsimple

**Author:** Estebanronsin  
**Date:** 2025-12-20

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

Budgetsimple is a FIRE-oriented “financial OS” that unifies a user’s financial life (income, expenses, rent, investing, assets/liabilities) into:

- an insight-first **Dashboard** (status + signals),
- a first-class **Cashflow Map** (“income → where it goes”) for explanation and drilldown,
- **Planning** via envelope goals with projections and action items,
- and an **Investing** area that includes “wealth-building” tooling (net worth projections + compounding scenarios).

The UX must feel trustworthy, clear, and fast: after import/sync, users should see meaningful analysis immediately, and every number should be explainable via drilldowns.

### Target Users

- **Primary:** FIRE builder / wealth-ambitious user who wants savings rate, % invested, net worth evolution, and goal projections without spreadsheet overhead.
- **Secondary:** friends (less setup tolerance) who want guided onboarding and a dashboard that is useful on day 1.

Usage context:
- Desktop-first web app; used weekly/monthly for review + planning, and ad-hoc to check spending patterns, savings rate, and goal progress.

### Key Design Challenges

- **Trust + clarity:** projections must be clearly labeled (planned vs historical) and explainable; avoid “black box” outputs.
- **Onboarding friction:** import/sync, mapping, categorization, and subscription review must be intuitive and guided.
- **Navigation density:** many domains (dashboard, cashflow, plan, investing, benchmarks, connect) need coherent IA without sidebar fatigue.
- **Multi-currency complexity:** preserve native currencies while reporting in a single display currency consistently across pages.
- **Connector readiness:** brokerage data (Canada/France) will arrive via mixed sources (CSV + APIs) and must not break the UX.

### Design Opportunities

- **Dashboard as snapshot**: crisp cards that summarize status and route users to deeper views, not a cluttered “everything page”.
- **Cashflow Map as explainer**: a dedicated page that tells the “where money goes” story and powers drilldowns.
- **Goal-oriented planning**: envelopes as a motivating system with progress and deterministic projections (planned schedule vs historical pace).
- **Wealth-building lens**: investing page includes net worth projection and a compounding scenario calculator tied to actionable changes.

### IA Decision (from Party Mode)

- Make **Cashflow Map a full page** (not just a widget).
- Keep **Dashboard** overview-only with strong links into Cashflow/Plan/Investing drilldowns.
- Put **net worth projections + compounding scenario calculator** in Investing as a “Wealth Builder” section/tab.

