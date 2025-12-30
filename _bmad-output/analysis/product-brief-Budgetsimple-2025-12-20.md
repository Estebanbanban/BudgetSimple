---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - "_bmad-output/analysis/product-brief-one-pager.md"
  - "_bmad-output/analysis/brainstorming-session-2025-12-20T154326Z.md"
  - "_bmad-output/index.md"
workflowType: "product-brief"
lastStep: 6
project_name: "Budgetsimple"
user_name: "Estebanronsin"
date: "2025-12-20"
---

# Product Brief: Budgetsimple

**Date:** 2025-12-20  
**Author:** Estebanronsin  

---

## Executive Summary

Budgetsimple is a FIRE-oriented, multi-user web app that becomes a user’s “financial OS”: it ingests income/expense/rent/investing data and turns it into an insight-first dashboard, a cashflow map (where money goes), and an actionable plan (goals/envelopes + projections + recommendations). MVP is private-by-default (each user sees only their own data) with a path to anonymized cohort benchmarking (geo + income band + age band) and market data integrations (rent comps).

---

## Core Vision

### Problem Statement

People who are ambitious to grow their wealth (especially FIRE-minded users) struggle to get a unified, trustworthy view of their financial life: where they spend, how they save/invest, how close they are to goals, and what to do next. Existing tools are often fragmented (bank vs broker vs spreadsheets), opaque, or not designed around “planning ahead” with clear projections.

### Problem Impact

- Users can’t easily answer: “Where is my money going?”, “How much do I really save/invest?”, “Am I on track for my goals?”, “What should I change?”
- Planning (envelopes/goals) feels disconnected from real transaction behavior.
- Multi-currency and multiple accounts make rollups confusing.
- Lack of clear insights leads to missed opportunities (subscriptions creep, low investing rate, overspending categories, slow goal progress).

### Why Existing Solutions Fall Short

- Many dashboards don’t provide a compelling “cashflow story” (sources → sinks → destinations) and action items.
- Goal tracking is often simplistic; projections feel untrustworthy or require heavy manual management.
- Integrations and security models vary; DIY spreadsheets are powerful but not scalable, not shareable, and hard to maintain.

### Proposed Solution

Build a dashboard-first product that:

1) **Connects** to financial data (CSV first; brokerage holdings + transactions and other APIs later, server-side),  
2) **Normalizes** it into a coherent model (accounts, currencies, transfers, merchants, subscriptions),  
3) **Explains** it via an insight-first dashboard + a cashflow map, and  
4) **Plans** via envelope goals with clear projections (planned vs historical) and recommended actions.

### Key Differentiators

- **Cashflow map as a first-class primitive**: “Income → where it goes” (categories + envelopes + investing + liabilities).
- **Goal projections users can understand**: two curves (planned schedule vs historical pace), no confusing uncertainty visuals.
- **Wealth-building lens**: compounding scenarios, net worth evolution, savings rate and % invested as top KPIs.
- **Privacy-first multi-user foundation**: secure auth + DB isolation per user, with optional anonymized benchmarking.

---

## Target Users

### Primary Users

**Persona: “FIRE Builder” (Esteban-like)**
- Motivations: grow net worth, control spending, maximize savings rate, invest consistently, plan big purchases/goals.
- Current workflow: mix of bank CSVs, broker statements, manual tracking/spreadsheets.
- Pain: fragmented views, hard to see true cashflow allocation and goal trajectory, recurring costs hard to control.
- Success: a single dashboard that instantly shows what matters + what to do next; goals that feel “on track”.

### Secondary Users

**Persona: “Friends Who Want Simplicity”**
- Motivations: learn spending/investing habits, compare to targets, feel progress.
- Pain: complexity and setup friction.
- Success: onboarding/import that “just works”, with insights visible immediately.

### User Journey

1) **Discovery:** sees a dashboard/cashflow-map-first budgeting app built for goals + wealth growth  
2) **Onboarding:** connect/import data, set display currency, confirm key accounts, optionally set a first goal  
3) **Aha moment:** dashboard shows savings rate, % invested, top categories, subscription summary, and a cashflow map  
4) **Routine:** weekly/monthly review → adjust subscriptions/categories → set envelope contributions → follow action items  
5) **Long-term:** net worth grows; goals complete; benchmarks and market comps guide optimization

---

## Success Metrics

User success (outcome + behavior):
- Users can import/sync and see a meaningful dashboard quickly (fast “time to first insight”).
- Users can answer core questions: top spending, recurring subs, savings rate, % invested, net worth trend, goal ETAs.
- Users act on insights (e.g., cancel subscriptions, adjust budgets, increase investing rate, contribute to goals).

### Business Objectives

- Provide a solid private multi-user foundation for sharing with friends (hosted, secure, reliable).
- Build toward optional anonymized benchmarking and market-data value adds without compromising privacy.

### Key Performance Indicators

(Initial qualitative → later quantitative instrumentation)
- Successful onboarding completion rate (import/sync → dashboard shown)
- “Dashboard value” self-report (does it answer what the user needs?)
- Weekly/monthly review habit (return frequency)
- Action items completion (did users follow recommendations?)

---

## MVP Scope

### Core Features

- **Dashboard-first home** with:
  - savings rate, % invested of net income, MoM income vs expenses, spending per day, net worth trend
  - top categories + drilldown + recurring subscription summary
  - action items panel (insight → recommendation)
  - **cashflow map** that is interactive (click to drill into transactions)
- **Envelopes as savings goals**:
  - create/manage goals and contributions
  - chart with two curves: planned schedule vs historical projection + ETA labels
- **Multi-user app foundation**:
  - auth + secure database isolation per user (RLS/policies)
- **Multi-currency**:
  - per-account/per-transaction currency truth, single display currency rollups
- **Investing ingestion (MVP)**:
  - support holdings + transactions (CSV first) and include in net worth and cashflow destinations

### Out of Scope for MVP

- User-to-user sharing of detailed financial data.
- Confidence bands/uncertainty visualization for envelope ETA.
- Full performance analytics (TWR/MWR), tax optimization, advanced rebalancing.
- Full bank connectors (if brokerage connectors are prioritized first).

### MVP Success Criteria

- For a typical user dataset, the dashboard and cashflow map feel “complete enough” to guide decisions.
- Envelope projections feel believable and motivate action (increase contributions, set schedules).
- Hosted app supports multiple users with strong privacy and correctness.

### Future Vision

- Brokerage and bank connectors (server-side token handling)
- Rent benchmarks and other market-data enrichments
- Cohort benchmarking (geo + income + age) with privacy guarantees
- Compounding scenario planner and “financial objective completion” dashboards
- More robust subscription detection and merchant normalization workflows

