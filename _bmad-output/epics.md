---
stepsCompleted: ["requirements-extracted", "epics-approved", "stories-created"]
inputDocuments:
  - "_bmad-output/project-planning-artifacts/prd.md"
  - "_bmad-output/architecture.md"
  - "_bmad-output/ux-design-specification.md"
---

# Budgetsimple - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Budgetsimple, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users must authenticate and only access their own data (strict per-user isolation / tenant scoping on all stored rows).
FR2: System must support multi-currency by storing native currency per account/transaction and reporting in a user-selected display currency using stored “as-of” FX rates (ECB + Bank of Canada sources).
FR3: System must provide a Cashflow Map that visualizes “income → where it goes” across expense categories/merchants/subscriptions, envelopes (savings goals), investing destinations, liabilities, transfers, and unallocated; nodes are clickable for drilldowns and drive explanatory summaries.
FR4: System must provide dashboard analytics and drilldowns that answer spending composition, subscriptions, savings rate, % invested of net income, burn rate/runway; every KPI supports “explain this number” with contributing rows.
FR5: System must support envelopes (saving goals) with CRUD + contributions tracking and a chart showing two deterministic projections (plan schedule vs historical pace) with ETA dates and optional “contribute X/month” prompt.
FR6: System must provide rent analysis and benchmarks for Canada and France (city-level to start; Paris arrondissement/neighborhood as enrichment), including cross-country normalization into display currency with clear methodology labeling.
FR7: System must ingest brokerage holdings + transactions for Canada and France via CSV first and prioritized connectors (Canada: Questrade, plus aggregator/exports for Wealthsimple/RBC DI; France: Saxo OpenAPI, plus aggregator/exports for Boursorama/Trade Republic) with server-side connectors and secure token storage.
FR8: System must detect recurring subscriptions, surface review/confirmation, and summarize subscriptions per month with quick categorization/tagging.
FR9: System must provide a guided import/onboarding UX: connect/import → confirm accounts/currency → review top merchants + subscriptions → set first envelope (optional) → land on dashboard with immediate insights.

### NonFunctional Requirements

NFR1: Desktop-first, information-dense UX with fast navigation.
NFR2: Performance: dashboard renders quickly on typical personal datasets (efficient aggregations; avoid unnecessary recomputation).
NFR3: Privacy: benchmarking is aggregated and opt-in; no user-to-user visibility (each user only sees their data).
NFR4: Auditability: store “as-of” metadata and sources for FX and benchmarks; calculations must be explainable via drilldowns.
NFR5: Security: external connectors are server-side; secrets never in the browser; strict tenant isolation enforced (RLS).

### Additional Requirements

- Separate repos: `budgetsimple-web` (Next.js) and `budgetsimple-api` (Fastify); not a monorepo.
- Auth + DB: Supabase (Postgres + Auth) with RLS everywhere by `user_id`.
- Backend owns an OpenAPI contract; frontend generates a typed client (`openapi-typescript`) from backend OpenAPI artifact.
- Frontend hosting: Vercel; backend hosting: long-running server platform (Railway/Fly.io/AWS/ECS later).
- Consistent “explain this number” drilldown component across KPI cards/charts.
- Cashflow Map is a dedicated full page with deeper analysis (not only a dashboard widget).
- Dashboard is a snapshot overview with drilldowns and action items (avoid “everything on one screen” clutter).
- Investing includes a “Wealth Builder” section (net worth projections + compounding scenario calculator).
- Cashflow allocation rules (from PRD open question answer): transfers shown as a category; split transactions and investment buy/sell not included in cashflow map.

### FR Coverage Map

FR1: Epic 1 - Sign-in, user workspace, and strict data isolation
FR2: Epic 1/2 - Multi-currency foundations + reporting in display currency
FR3: Epic 5 - Cashflow Map visualization + drilldowns + summaries
FR4: Epic 3 - Dashboard KPIs + “explain this number” drilldowns
FR5: Epic 6 - Envelopes + contributions + deterministic projections
FR6: Epic 7 - Rent analysis + benchmarks (Canada + France)
FR7: Epic 8 - Investing ingestion (CSV + prioritized connectors) + wealth builder views
FR8: Epic 4 - Subscription detection + review + subscription summaries
FR9: Epic 2 - Import + guided onboarding to first insights

## Epic List

### Epic 1: Sign-in, User Workspace, and Currency Preferences

Users can sign in securely, see only their own data, and set a display currency for reporting.
**FRs covered:** FR1, FR2 (display currency + FX foundations)

### Epic 2: Import + Guided Onboarding to “First Insights”

Users can import/sync data (CSV-first), enter rent price, enter incomes, confirm accounts/currencies, capture location (country, city, ZIP), review top merchants, and land on a usable dashboard baseline.
**FRs covered:** FR2 (data model usage), FR9

### Epic 3: Dashboard KPIs + “Explain This Number” Drilldowns

Users get core FIRE analytics (savings rate, burn rate/runway, category/merchant breakdowns) with explain views integrated into the cashflow map.
**FRs covered:** FR4

### Epic 4: Subscription Detection + Review Workflow

Users see detected recurring subscriptions, confirm/correct them, and get “subscriptions per month” summaries with quick categorization/tagging.
**FRs covered:** FR8

### Epic 5: Cashflow Map (Dedicated Page) + Narrative Drilldowns

Users can visualize “income → where it goes” (including transfers category; excluding split tx + investment buy/sell), click nodes to filter, and read auto-summaries.
**FRs covered:** FR3

### Epic 6: Envelopes (Goals) + Deterministic Projections

Users can create/manage envelope goals, track contributions, and view the two-curve chart (plan vs historical pace) with ETAs.
**FRs covered:** FR5

### Epic 7: Rent Analysis + Benchmarks (Canada + France)

Users can identify rent, compare vs benchmark at city level (Canada/France) with cross-country normalization and clear labeling; supports Paris enrichment later.
**FRs covered:** FR6

### Epic 8: Investing Data (Holdings + Transactions) + Wealth Builder

Users can import brokerage holdings/transactions (CSV-first), then connect prioritized brokers, and use investing views feeding net worth + projections/compounding tools.
**FRs covered:** FR7

## Epic 1: Sign-in, User Workspace, and Currency Preferences

Users can sign in securely, see only their own data, and set a display currency for reporting.

### Story 1.1: Initialize Web + API Repos from Starter Templates

As a developer,
I want to initialize the frontend and backend repos from known starter templates,
So that the team can build features on a consistent, repeatable foundation.

**Acceptance Criteria:**

**Given** a clean git workspace for two separate repos
**When** I initialize `budgetsimple-web` with the selected Next.js template and `budgetsimple-api` with the selected Fastify template
**Then** both projects start locally with default routes/health checks
**And** each repo has a documented local run command and environment variable stub files

**Given** the architecture requirement for an API contract
**When** the backend exposes an initial OpenAPI spec (even for a simple health endpoint)
**Then** the frontend can generate a typed client from that OpenAPI artifact

### Story 1.2: Configure Supabase Auth + Baseline User Data Isolation

As a developer,
I want Supabase Auth and RLS configured for tenant isolation,
So that users can only ever access their own data.

**Acceptance Criteria:**

**Given** a Supabase project is created
**When** baseline tables needed for auth/profile/preferences are created (e.g., `profiles`)
**Then** Row Level Security is enabled on those tables
**And** policies enforce `user_id = auth.uid()` for all reads/writes

**Given** a signed-in user
**When** they attempt to access another user’s row by ID (direct query via API)
**Then** the request is denied and no data is leaked

### Story 1.3: Sign In / Sign Out UX and Session Handling

As a user,
I want to sign in and sign out reliably,
So that my data is private and my session is secure.

**Acceptance Criteria:**

**Given** I am not authenticated
**When** I visit the app
**Then** I am routed to a sign-in screen and cannot access private pages

**Given** I authenticate successfully
**When** I load the dashboard
**Then** API calls include a valid auth token
**And** unauthorized API responses force a safe sign-out and redirect to sign-in

### Story 1.4: Display Currency Preference

As a user,
I want to choose a display currency,
So that all dashboards and benchmarks render in a single currency I understand.

**Acceptance Criteria:**

**Given** I am signed in
**When** I set my display currency (e.g., CAD or EUR)
**Then** the preference is persisted in my profile/preferences data
**And** future sessions load and apply it by default

## Epic 2: Import + Guided Onboarding to “First Insights”

Users can import/sync data (CSV-first), confirm accounts/currencies, review top merchants, and land on a usable dashboard baseline.

### Story 2.1: Create Accounts + Transactions Data Model (User-Scoped)

As a developer,
I want user-scoped account and transaction tables aligned with the PRD,
So that imports and analytics have a consistent foundation.

**Acceptance Criteria:**

**Given** Supabase Postgres is available
**When** I create the minimum tables required for importing accounts and transactions
**Then** every row is user-scoped (RLS enabled, policies enforced)
**And** each transaction stores amount + native currency + date + description + account reference

### Story 2.2: CSV Import for Transactions (MVP) with Data Health Feedback

As a user,
I want to import transactions from CSV,
So that I can get insights without waiting for connectors.

**Acceptance Criteria:**

**Given** I have a supported CSV file
**When** I upload/import it via the app
**Then** the app shows a preview with mapping/validation errors (missing date/amount/currency)
**And** on success the transactions are stored and visible in drilldowns

**Given** a CSV contains potential duplicates
**When** I import it
**Then** the app flags duplicates for review or de-duplicates via a documented rule

### Story 2.3: Guided Onboarding Flow to Baseline Dashboard

As a user,
I want a guided onboarding flow after import,
So that I know what to do next and reach a useful dashboard quickly.

**Acceptance Criteria:**

**Given** I finished an import
**When** I proceed through onboarding steps (confirm accounts/currency → location (country, city, ZIP) → review top merchants + subscriptions → optional first envelope)
**Then** each step is skippable but clearly recommended
**And** I end on the dashboard with populated charts/cards

### Story 2.4: FX Rates Ingestion and Report-Time Conversion (ECB + BoC)

As a developer,
I want an FX rate store and conversion utility,
So that multi-currency reporting is consistent and auditable.

**Acceptance Criteria:**

**Given** ECB and Bank of Canada sources are configured
**When** the system ingests and stores FX rates with provider + date metadata
**Then** conversions can be computed at report time into the user’s display currency
**And** each report can state the “as-of” FX date/source used

## Epic 3: Dashboard KPIs + “Explain This Number” Drilldowns

Users get core FIRE analytics with drilldowns that reconcile to transactions.

### Story 3.1: Core Dashboard KPIs and Visualizations (Baseline)

As a user,
I want a dashboard overview of my finances,
So that I can quickly understand my current status and trends.

**Acceptance Criteria:**

**Given** I have imported transactions
**When** I view the dashboard for a selected time range
**Then** I can see at minimum income vs expenses (MoM), expense category breakdown, and spending per day
**And** I can see savings rate (when data exists)

**Given** data is missing for certain KPIs (e.g., no investing transactions)
**When** I view the dashboard
**Then** the UI shows clear “not enough data” states without breaking other cards

### Story 3.2: Universal “Explain This Number” Drilldown

As a user,
I want to click any KPI/chart and see an explain view integrated with the cashflow map,
So that I can trust and verify every number.

**Acceptance Criteria:**

**Given** I am viewing any KPI/chart on Dashboard
**When** I click “Explain this number”
**Then** I am routed to the Cashflow Map page with the relevant nodes highlighted/zoomed
**And** the page shows the contributing transactions/records and the exact filters used
**And** totals reconcile to the KPI value

### Story 3.3: Action Items Panel (Insight → Recommendation)

As a user,
I want a short list of actionable insights,
So that the app helps me decide what to change.

**Acceptance Criteria:**

**Given** I have at least one month of data
**When** I open the dashboard
**Then** I see a small set of generated action items (e.g., top category spike, subscriptions total, envelope behind pace)
**And** each action item links to the relevant drilldown view

## Epic 4: Subscription Detection + Review Workflow

Users see detected recurring subscriptions, confirm/correct them, and get subscription summaries.

### Story 4.1: Subscription Detection (Recurring Pattern Candidates)

As a user,
I want the app to detect likely subscriptions,
So that I can identify recurring spend quickly.

**Acceptance Criteria:**

**Given** I have at least several weeks of transactions
**When** the system analyzes transactions for recurring patterns (e.g., monthly cadence + consistent merchant)
**Then** it produces a list of subscription candidates with estimated monthly cost
**And** candidates are explainable via the contributing transactions

### Story 4.2: Subscription Review and Confirmation UI

As a user,
I want to confirm or reject detected subscriptions,
So that the subscription list reflects reality.

**Acceptance Criteria:**

**Given** subscription candidates exist
**When** I review a candidate
**Then** I can confirm it as a subscription, reject it, or adjust the merchant/category mapping
**And** confirmed subscriptions appear in summaries and dashboard drilldowns

### Story 4.3: Subscription Summaries (“Subscriptions per Month”)

As a user,
I want a subscriptions summary,
So that I know my recurring spend and can reduce it if needed.

**Acceptance Criteria:**

**Given** I have confirmed subscriptions
**When** I open subscription summaries
**Then** I see total subscriptions per month and a breakdown by merchant/category
**And** each summary links to contributing transactions

## Epic 5: Cashflow Map (Dedicated Page) + Narrative Drilldowns

Users can visualize “income → where it goes”, click nodes to filter, and read auto-summaries.

### Story 5.1: Cashflow Classification Rules and Flow Graph Computation

As a developer,
I want deterministic rules to classify transactions and compute a flow graph,
So that the cashflow map matches the dashboard and remains explainable.

**Acceptance Criteria:**

**Given** a selected time range and a set of transactions
**When** the cashflow computation runs
**Then** it produces a flow graph: income sources → sinks (categories/merchants/subscriptions/envelopes/investing/liabilities/transfers/unallocated)
**And** transfers are represented as a category in the map
**And** split transactions and investment buy/sell transactions are excluded from the cashflow map

### Story 5.2: Cashflow Map Page with Interactive Nodes

As a user,
I want a dedicated cashflow map page,
So that I can understand “where my money goes” visually.

**Acceptance Criteria:**

**Given** I have imported transactions
**When** I open the Cashflow Map page for a time range
**Then** I see a flow visualization with proportional edges
**And** nodes and edges are clickable and keyboard accessible
**And** deep links from “Explain this number” highlight/zoom to the relevant node(s)

### Story 5.3: Cashflow Drilldowns and Cross-Filtering

As a user,
I want to click a node and see the contributing transactions,
So that I can investigate and take action.

**Acceptance Criteria:**

**Given** I am viewing the cashflow map
**When** I click a node (e.g., “Groceries” or “Transfers”)
**Then** I see a drilldown list of contributing transactions and totals
**And** other supporting panels on the page update consistently to match the selection
**And** savings rate explain shows the % and the savings buckets (envelopes, investing, unallocated)

### Story 5.4: Cashflow Narrative Summaries

As a user,
I want short textual summaries of my cashflow,
So that I can grasp the biggest drivers without reading every transaction.

**Acceptance Criteria:**

**Given** the cashflow map is computed
**When** I view the summaries section
**Then** I see “top sinks”, “top savings destinations”, and “unallocated” highlights
**And** each summary item links to its drilldown

## Epic 6: Envelopes (Goals) + Deterministic Projections

Users can create/manage envelopes, track contributions, and view deterministic ETA projections.

### Story 6.1: Envelopes CRUD + Contributions Tracking

As a user,
I want to create envelopes and record contributions,
So that I can track progress toward savings goals.

**Acceptance Criteria:**

**Given** I am signed in
**When** I create/edit/archive an envelope with a target amount
**Then** it is persisted and visible in my envelopes list
**And** only I can access it (per-user isolation)

**Given** an envelope exists
**When** I add contributions (date, amount, currency, optional source/destination)
**Then** contributions are stored and the envelope progress updates

### Story 6.2: Plan Schedule Curve (Deterministic)

As a user,
I want to define a planned contribution schedule,
So that I can see the planned trajectory toward my target.

**Acceptance Criteria:**

**Given** an envelope exists
**When** I set a monthly planned contribution amount (or schedule)
**Then** the system generates a deterministic plan curve over time
**And** the curve ends at the envelope target amount

### Story 6.3: Historical Pace Projection Curve + ETA

As a user,
I want a projection based on my historical contributions,
So that I can see when I’ll reach my goal if I continue as-is.

**Acceptance Criteria:**

**Given** an envelope has contribution history
**When** the system computes a historical pace projection
**Then** it generates a deterministic projection curve and an ETA date (if computable)
**And** the algorithm is documented and uses only historical contributions (no confidence bands)

### Story 6.4: Two-Curve Visualization + “Contribute X/Month” Prompt

As a user,
I want to compare planned vs historical trajectories,
So that I can adjust contributions to hit a target date.

**Acceptance Criteria:**

**Given** an envelope has a plan and historical contributions
**When** I view the envelope chart
**Then** I see two curves on the same graph (plan vs historical pace) with both ETAs
**And** the UI can show a suggested monthly contribution to hit a chosen target date (if I opt in)

## Epic 7: Rent Analysis + Benchmarks (Canada + France)

Users can identify rent, compare vs benchmarks, and view cross-country comparisons.

### Story 7.1: Rent Identification and Rent Spend Analytics

As a user,
I want the app to identify my rent spending,
So that I can analyze it and compare it to benchmarks.

**Acceptance Criteria:**

**Given** I have transactions
**When** the system detects rent transactions (by category/rules or user confirmation)
**Then** it computes my rent spend metrics for a selected period
**And** I can drill down to the contributing rent transactions

### Story 7.2: Ingest Rent Benchmark Datasets (CMHC + Carte des loyers)

As a developer,
I want to ingest Canada and France rent benchmark datasets into a normalized table,
So that the app can compare user rent to local benchmarks.

**Acceptance Criteria:**

**Given** benchmark sources are available
**When** I run the ingestion pipeline for Canada (CMHC) and France (Carte des loyers)
**Then** benchmark rows are stored with source refs, geo keys, time period, unit/size buckets, and native currency
**And** the system can query benchmarks by country + city/commune

### Story 7.3: Rent Benchmark View + Cross-Country Normalization

As a user,
I want to compare my rent to local benchmarks and across countries,
So that I can evaluate whether my rent is high for my location.

**Acceptance Criteria:**

**Given** I have identified my rent and selected my city
**When** I open the rent analysis page
**Then** I see my rent vs the benchmark with clear labeling of dataset and limitations
**And** when comparing France vs Canada the values are normalized into my display currency using stored as-of FX rates

## Epic 8: Investing Data (Holdings + Transactions) + Wealth Builder

Users can ingest investing data, and use wealth-building tools that incorporate it.

### Story 8.1: Brokerage CSV Import for Holdings and Transactions

As a user,
I want to import brokerage transactions and holdings from CSV,
So that my investing and net worth analysis works even before connectors.

**Acceptance Criteria:**

**Given** I have a supported brokerage CSV export
**When** I import it
**Then** the app stores transactions and holdings snapshots in user-scoped tables
**And** imported investing data appears in drilldowns and investing views

### Story 8.2: Secure Connector Framework + Token Storage (Server-Side)

As a developer,
I want a connector framework with secure token storage,
So that brokerage integrations can be added without exposing secrets to the browser.

**Acceptance Criteria:**

**Given** the backend API is running
**When** a user connects a provider that requires tokens
**Then** tokens are stored server-side (not in the web client) and associated to the user
**And** connector actions are executed only by authenticated requests

### Story 8.3: Questrade Connector (Canada) for Transactions and Holdings

As a user in Canada,
I want to connect Questrade to import investing data,
So that my net worth and investing analysis stays up to date.

**Acceptance Criteria:**

**Given** I have valid Questrade credentials/tokens
**When** I connect Questrade and run a sync
**Then** the system imports holdings and transactions into the normalized schema
**And** sync errors are surfaced in a connector status UI

### Story 8.4: Saxo Connector (France) for Transactions and Holdings

As a user in France,
I want to connect Saxo to import investing data,
So that my net worth and investing analysis stays up to date.

**Acceptance Criteria:**

**Given** I have valid Saxo credentials/tokens
**When** I connect Saxo and run a sync
**Then** the system imports holdings and transactions into the normalized schema
**And** sync errors are surfaced in a connector status UI

### Story 8.5: Wealth Builder (Net Worth Projections + Compounding Scenarios)

As a user,
I want to model net worth projections and compounding scenarios,
So that I can see the impact of changing savings/investing behavior.

**Acceptance Criteria:**

**Given** I have baseline income/expenses and optional investing data
**When** I adjust scenario inputs (monthly invest amount, return rate, timeframe)
**Then** I see projected curves and summary metrics in the Investing “Wealth Builder” section
**And** all projections are labeled as scenario outputs (not guaranteed) and are explainable
