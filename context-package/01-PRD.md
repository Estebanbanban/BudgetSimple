---
stepsCompleted: ["draft"]
inputDocuments:
  - "_bmad-output/analysis/product-brief-Budgetsimple-2025-12-20.md"
  - "_bmad-output/analysis/research/technical-canada-france-brokerage-rent-fx-research-2025-12-20T155518Z.md"
  - "_bmad-output/analysis/brainstorming-session-2025-12-20T154326Z.md"
  - "_bmad-output/index.md"
workflowType: "prd"
lastStep: 0
---

# Product Requirements Document (PRD) — Budgetsimple

**Author:** Estebanronsin  
**Date:** 2025-12-20  
**Scope:** Multi-user FIRE dashboard + cashflow map + envelopes/goals, targeting Canada + France first  

## 1) Executive Summary

Budgetsimple is a FIRE-oriented web app that acts as a user’s “financial OS”: it ingests income/expense/rent/investing data, normalizes it across accounts and currencies, and presents (1) an insight-first dashboard, (2) a cashflow map (“income → where it goes”), and (3) a planning system (envelopes/goals with projections and action items).  

MVP is private-by-default (each user sees only their own data) and supports multi-currency and a clear path to market-data rent benchmarks and brokerage connectors in Canada and France.

## 2) Goals (what this PRD optimizes for)

1. **Dashboard-first “Aha”**: after connect/import, users immediately see useful visuals and insights.
2. **Cashflow map is core**: a first-class visualization + drilldown navigation across income, expenses, savings, investing, liabilities.
3. **Goal planning that feels trustworthy**: envelopes show two deterministic projections (planned schedule vs historical pace).
4. **Canada + France ready**: multi-currency model + rent benchmarks + brokerage ingestion strategy aligned with those markets.
5. **Multi-user security**: auth + strict per-user data isolation.

## 3) Non-Goals (MVP)

- Sharing raw user data between friends (no “social feed” or peer-to-peer data visibility).
- Uncertainty visualization (confidence bands) for envelope ETA.
- Full portfolio performance analytics (TWR/MWR), tax optimization, rebalancing.

## 4) Personas

- **FIRE Builder (primary):** wants savings rate, % invested, net worth growth, and goal ETAs; hates spreadsheet overhead.
- **Friends (secondary):** want intuitive onboarding/import and a clear dashboard; minimal configuration.

## 5) Information Architecture (IA)

### 5.1 Home (Dashboard)

Home must include:

- Savings rate (primary KPI) + trend
- % invested of net income + trend
- Income vs expenses MoM bars (and/or cashflow bars)
- Expense category pie + drilldown
- Spending per day chart (trend/spikes)
- Net worth chart (assets + liabilities) + goal completion projection
- Rent analysis: actual vs budget + benchmark vs city (Canada/France)
- Action items panel (insight → recommendation)
- **Cashflow map** (centerpiece): sources → sinks → destinations, clickable

### 5.2 Connect

- Import/sync status
- Data health: duplicates, missing accounts, missing currencies, unmatched merchants

### 5.3 Plan

- Envelopes overview + envelope details
- Budgets (category budgets + rent handling)

### 5.4 Investing

- Accounts, holdings, transactions
- Allocation basics; feeds into net worth + cashflow destinations

## 6) Core Data Model (conceptual)

- **User**
- **Account** (type: cash/bank/brokerage/credit/loan; native currency; provider)
- **Transaction** (date, amount, currency, account, type: income/expense/invest/transfer, merchant/description, category, tags)
- **Holding snapshot** (account, instrument, quantity, price, currency, as_of)
- **Category** + **Rules** (merchant normalization, recurring subscription detection)
- **Envelope goal** (target amount + contributions + optional plan schedule)
- **FX rate** (provider, base, quote, date, rate, metadata)
- **Rent benchmark** (country, city/geo key, unit type/size bucket, period, currency, value, source ref)

## 7) Functional Requirements

### FR-1: Auth + per-user isolation (MVP-critical)

- Users must authenticate.
- All stored data rows must be scoped to a user and isolated by policy (no cross-user reads).

### FR-2: Multi-currency support (MVP-critical)

- Every account and transaction stores its native currency.
- User selects a display currency for dashboards (CAD/EUR/etc.).
- FX conversion happens at aggregation/report time, with recorded “as-of” rates.
- FX sources:
  - ECB euro reference rates feed (for EUR base): https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
  - Bank of Canada Valet API (for CAD-related series): https://www.bankofcanada.ca/valet/docs

### FR-3: Cashflow map (core)

**User story:** As a user, I want to see where my income goes so I can decide what to change.

Requirements:

- Visualize flows in the selected range:
  - Income sources → expense categories/merchants/subscriptions
  - Income sources → envelopes (savings goals)
  - Income sources → investment destinations (brokerage accounts)
  - Income sources → liabilities (debt payments)
  - Remaining/unallocated
- Clicking a node filters other dashboard panels and shows contributing transactions.
- Provide textual summaries derived from the map (top sinks, top savings destinations, unallocated).

### FR-4: Dashboard analytics & drilldowns (core)

- Must answer:
  - Where do I spend the most? (categories + merchants)
  - What recurring subscriptions do I have? (detected + confirmed)
  - What is my savings rate and % invested? (trend and range)
  - What is my burn rate and runway?
- Each card/chart must support “explain this number” → list of contributing rows.

### FR-5: Envelopes (goals) + projections (core)

**Envelope definition:** a savings goal toward an objective (Dave Ramsey style).

Requirements:

- Create/edit/archive envelopes with target amount.
- Track contributions (date, amount, from/to accounts optional).
- Chart with two curves on one graph:
  1) **Plan curve** (scheduled contributions)
  2) **Historical projection curve** (“if you continue like you’ve been contributing”)
- Show ETA dates for both curves (if computable).
- Provide action prompt: “To hit target by DATE, contribute X/month” (optional, but recommended).

### FR-6: Rent analysis + benchmarks (Canada + France)

Requirements:

- Compute actual rent from transactions (and/or use “virtual rent” if missing).
- Benchmark against:
  - Canada: city-level (starting with CMHC rental market data tables)  
    https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market
  - France: city/commune-level (Carte des loyers dataset)  
    https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025
- Cross-country comparison: normalize to display currency and clearly label methodology limitations.
- Paris arrondissement/neighborhood: treat as follow-up enrichment dataset (model supports multi-level geo).

### FR-7: Brokerage holdings + transactions ingestion (Canada + France)

Stage approach:

- CSV import first (works for any broker).
- Connector priorities:
  - Canada: Questrade API early  
    https://www.questrade.com/api  
    https://www.questrade.com/api/documentation/getting-started
  - France: Saxo OpenAPI early  
    https://www.developer.saxo/  
    https://www.developer.saxo/openapi/referencedocs
- Aggregation option:
  - Canada: Wealthica Investment API (validate coverage for Wealthsimple/RBC DI)  
    https://wealthica.com/investment-api/
- All connectors must be server-side with secure token storage.

### FR-8: Subscription detection (core insight)

- Detect recurring merchant patterns (monthly cadence) and surface a review list.
- Summarize “subscriptions per month” and allow quick categorization/tagging.

### FR-9: Data import UX (core)

- Onboarding should guide:
  1) connect/import
  2) confirm accounts/currency
  3) review top merchants + subscriptions
  4) set first envelope goal (optional)
  5) land on dashboard with insights

## 8) Non-Functional Requirements

- Desktop-first UX with fast navigation and strong information density.
- Performance: dashboard should render quickly on typical personal datasets.
- Privacy: benchmarking is aggregated and opt-in (no user-to-user visibility).
- Auditability: store “as-of” metadata for FX and benchmark sources.

## 9) Open Questions (PRD-level decisions)

1) Cashflow allocation rules: how to treat transfers, split transactions, and investment buys/sells in the map?
   
   Trnasfers should be shown as a category, split transaction and buy sells are not included

2) Envelope “historical projection” algorithm choice (rolling avg vs regression) and how to handle gaps/outliers.

3) 

4) Rent benchmark geo keys for Canada (city/metro naming normalization) and Paris enrichment sources.

5) Brokerage coverage feasibility for Wealthsimple and RBC DI (via aggregator vs export formats vs future connectors).

## 10) Proposed Next Workflow

After PRD approval:

- `create-ux-design` (conditional but recommended due to onboarding + dashboard complexity)
- `create-architecture` (recommended before building Next.js + connectors + multi-currency)
