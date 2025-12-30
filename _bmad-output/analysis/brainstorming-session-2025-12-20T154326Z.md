---
stepsCompleted:
  - "session-setup"
  - "idea-generation"
  - "idea-organization"
inputDocuments:
  - "_bmad-output/analysis/product-brief-one-pager.md"
  - "README.md"
  - "index.html"
  - "app.js"
session_topic: "Budgetsimple: FIRE dashboard + cashflow map + goals"
session_goals:
  - "Define the core dashboard (insight-first) information architecture"
  - "Make the cashflow map a primary navigation + mental model"
  - "Clarify envelopes as goals and the planned-vs-historical projection display"
  - "Outline multi-currency modeling (per transaction/account) + display currency"
  - "Identify the minimal cloud + connector foundation for multi-user"
selected_approach: "structured product brainstorming"
techniques_used:
  - "Jobs-to-be-done framing"
  - "Metric-first dashboard design"
  - "System mapping (cashflow graph)"
  - "Constraint-driven prioritization"
context_file: "_bmad/bmm/data/project-context-template.md"
---

# Brainstorming Session Results (Analyst-Led, Draft)

**Facilitator:** Mary (BMAD Analyst persona)  
**Date:** 2025-12-20

## 1) The “core object model” of the product (mental model)

Budgetsimple is a graph:

- **Sources**: income sources (job, freelance, dividends, etc.)
- **Pipes**: transfers (between accounts), conversions (FX), and allocations (rules/budgets)
- **Sinks**: expense categories + merchants + subscriptions
- **Destinations**: savings goals (envelopes), investment accounts, debt payoff

If you visualize and measure this graph well, the rest of the app becomes “interacting with the graph”.

## 2) Dashboard: insight-first, then drilldown

### Must-have widgets (home)

- Savings rate (primary KPI) + trend vs last period
- % invested of net income + trend
- Income vs expenses MoM bars (and/or cashflow)
- Expense category pie (click to drill)
- Spending per day chart (detect spikes)
- Net worth chart (assets + liabilities) + goal trajectory
- Rent burden + benchmark vs area (later: based on external market data)

### The centerpiece: cashflow map (must be first-class)

This is the “where does my money go” story, not just a chart.

**Minimum viable map (MVP):**
- Node types: income sources, expense categories, envelopes (goals), investment accounts, “unallocated”
- Edges: total flows in selected range
- Interaction: click node → filter dashboard + show contributing transactions

**Interpretation layer (insight text):**
- “Top sinks this month: Rent 31%, Groceries 14%, Subscriptions 6%”
- “Savings destinations: Emergency fund +$500, Brokerage +$800”
- “Unallocated cashflow: +$X (define: net income - expenses - allocations)”

## 3) Envelopes (goals): planned vs historical projection

Envelope = savings goal with a target amount.

### Two curves on one chart (no confidence bands)

1) **Planned curve**: based on user-configured schedule (monthly contribution on payday, etc.)
2) **Historical curve**: purely mathematical projection from past contributions (if you keep contributing like you have been)

**Key UX principle:** label them explicitly as “Plan” vs “Based on your history”.

### “Historical projection” options (pick one later)

- Rolling average monthly contribution over last N months
- Weighted average (recent months matter more)
- Simple linear regression on cumulative balance (current approach resembles this; can be improved to handle gaps/outliers)

**Action item hooks:**
- “To hit target by DATE, contribute $X/month”
- “At your current pace, ETA is DATE”

## 4) “Wealth OS” scope: cover the full financial life

To serve ambitious wealth builders, the app should model:

- **Assets:** cash, investments, retirement accounts, crypto, etc.
- **Liabilities:** credit cards, loans, mortgage (even if entered manually at first)
- **Recurring subscriptions:** detect and summarize (monthly recurring merchant patterns)
- **Compounding lens:** show how increased monthly investing affects net worth projection (simple scenario tool)

This doesn’t require perfect market pricing on day one; it requires a coherent model and clear approximations.

## 5) Multi-currency: per-transaction truth + single display currency

Principles:

- Every transaction has its native currency (and account currency).
- Reports roll up into a user-selected **display currency** using FX rates.
- Store FX rate source + timestamp for reproducibility (“as-of”).

Minimum viable:
- User chooses display currency.
- Manual FX rate entry or a simple FX rate feed later.
- Conversions happen at aggregation time (not by mutating original data).

## 6) Cloud + multi-user foundation (private-by-default)

MVP cloud rules:

- Auth + strict per-user row-level security
- Each user sees only their own data
- Benchmarking is **anonymized/aggregated** by cohorts (geo + income band + age band)

Connector principle:

- Brokerage/bank integrations must be server-side (tokens never in browser)
- Normalized transaction + holding models feed the same analytics pipeline as CSV imports

## 7) Candidate “north-star experiences” to design around

1) “After import/sync, I instantly see: savings rate, % invested, top spending, and where my money went.”
2) “My goals show a believable ETA and tell me exactly what to change to reach them sooner.”
3) “I can compare myself to a cohort without sacrificing privacy.”

## 8) Next brainstorm targets (if we continue)

- Cashflow map taxonomy (which nodes exist and how to allocate edges precisely)
- Subscription detection heuristics and UX (“review detected subscriptions”)
- Net worth model UX (manual vs connected holdings, liabilities, valuations)
- “Action items” rules engine: what insights become recommendations

