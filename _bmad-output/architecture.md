---
stepsCompleted: [1]
inputDocuments:
  - "_bmad-output/prd.md"
  - "_bmad-output/project-planning-artifacts/prd.md"
  - "_bmad-output/ux-design-specification.md"
  - "_bmad-output/analysis/product-brief-Budgetsimple-2025-12-20.md"
  - "_bmad-output/research/technical-canada-france-brokerage-rent-fx-research.md"
  - "_bmad-output/analysis/research/technical-canada-france-brokerage-rent-fx-research-2025-12-20T155518Z.md"
  - "_bmad-output/index.md"
workflowType: "architecture"
lastStep: 1
project_name: "Budgetsimple"
user_name: "Estebanronsin"
date: "2025-12-20"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (architectural implications):**
- **Auth + per-user isolation:** requires an auth provider + DB row-level access controls; every data row is `user_id` scoped.
- **Dashboard-first overview:** needs fast aggregation queries and consistent “explain this number” drilldowns across pages.
- **Cashflow Map as a dedicated page:** requires a canonical “flow graph” computation pipeline (income → categories → envelopes/investing/liabilities/unallocated) and a drilldown layer that can filter transactions deterministically.
- **Envelopes/goals with 2 projections:** requires a projection engine producing two deterministic series (plan vs historical pace) from the same underlying contributions data.
- **Investing (holdings + transactions):** requires normalized holdings snapshots + transactions; supports mixed ingestion (CSV now, connectors later).
- **Rent benchmarks (Canada + France):** requires a benchmark dataset store with geographic keys and unit/size buckets; supports cross-country normalization via FX.
- **Multi-currency:** requires storing native currency per account/transaction and converting at report time into a user-selected display currency, with FX “as-of” metadata.

**Non-Functional Requirements:**
- **Security:** connectors must be server-side; secrets never in browser; strict tenant isolation.
- **Correctness + auditability:** FX rates and benchmark sources must be attributable (provider + timestamp); calculations must be explainable.
- **Performance:** dashboard + cashflow computations should be incremental/cacheable; avoid recomputing everything on every view.
- **Extensibility:** add connectors per market (Canada/France first) without rewriting core model.
- **Desktop-first UX:** information-dense UI, but with clear navigation and drilldowns.

**Scale & Complexity:**
- Primary domain: full-stack web app (Next.js) with external integrations + analytics.
- Complexity level: **high** (multi-tenant + connectors + multi-currency + benchmarks + graph analytics).
- Estimated architectural components (MVP): ~8–10 (auth, API, DB, ingestion, normalization, analytics, cashflow graph, UI shell, benchmarks, FX service).

### Technical Constraints & Dependencies

- Initial markets: **Canada + France** (broker + rent + FX must support these first).
- Brokerage connectors priority:
  - Canada: Questrade (API), plus CSV/aggregator strategy for Wealthsimple + RBC DI.
  - France: Saxo (OpenAPI), plus CSV/aggregator strategy for Boursorama + Trade Republic.
- Rent benchmark sources:
  - Canada: CMHC tables (city-level).
  - France: data.gouv “Carte des loyers” (commune/city-level); Paris arrondissement/neighborhood is an enrichment layer.
- FX sources:
  - ECB EUR reference rates
  - Bank of Canada Valet API

### Cross-Cutting Concerns Identified

- **Data normalization:** merchant normalization, subscriptions, transfers, investment buys/sells, debt payments.
- **Cashflow semantics:** consistent classification rules across dashboard + cashflow + investing.
- **Permissions:** everything keyed by user; benchmarks only aggregated/opt-in later.
- **Observability:** ingestion errors, connector health, and “data health” UX surfaced to user.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web app with **separate repos**:

- Web UI: Next.js (React)
- API: Node.js (Fastify)
- Data/Auth: Supabase (Postgres + Auth)
- Hosting: Vercel (frontend)

### Starter Options Considered

1) Two separate repos (**selected**)  
2) Monorepo with workspaces  
3) Nx/Turborepo  

### Selected Starter: Two repos — `budgetsimple-web` + `budgetsimple-api`

**Rationale**

- Matches desired separation (independent deployments, clear ownership boundaries).
- Avoid “shared types” coupling by using an API contract.

**Contract Strategy (to avoid drift)**

- Backend owns an **OpenAPI** spec and versioning.
- Frontend generates a typed client from OpenAPI (single source of truth for request/response shapes).
- Changes are managed with semver + changelog on the API repo.

**Initialization Commands (versions verified)**

Frontend (repo: `budgetsimple-web`):

```bash
npx create-next-app@16.1.0 . --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"
```

Backend (repo: `budgetsimple-api`):

```bash
npx create-fastify@4.1.0 .
```

Note: `create-fastify@5.0.0` requires Node `>=20.19.0`; this workspace is on Node `v20.17.0`, so `4.1.0` was used for compatibility.

## Core Architectural Decisions (Draft)

### Decision Priority Analysis

**Critical (blocks implementation):**

- Separate repos: `budgetsimple-web` (Next.js) + `budgetsimple-api` (Fastify)
- Data/Auth: Supabase (Postgres + Auth) with per-user isolation (RLS)
- API contract: OpenAPI owned by backend; typed client generated in frontend
- Multi-currency: store native currency per account/tx; aggregate into user display currency using ECB/BoC FX

**Important (shapes architecture):**

- Validation strategy: Zod `4.2.1` (shared schema patterns; API owns truth)
- API docs (Fastify v4-compatible): `@fastify/swagger` `8.15.0` + `@fastify/swagger-ui` `4.2.0`
- Frontend data fetching/caching: TanStack Query `5.90.12`
- Logging: Pino `10.1.0`

**Deferred:**

- Anonymized cohort benchmarks pipeline + k-anonymity thresholds
- Paris arrondissement/neighborhood rent enrichment dataset
- Full bank connectors beyond initial brokerage focus

### Data Architecture

- Supabase Postgres as source of truth for user data
- Tables: users, accounts, transactions, holdings_snapshots, envelopes, envelope_contribs, fx_rates, rent_benchmarks
- FX sources: ECB eurofxref + Bank of Canada Valet (as-of metadata stored)

### Authentication & Security

- Supabase Auth
- RLS everywhere by `user_id`
- Backend uses service role key only server-side (never in web client)
- Connector secrets/tokens stored encrypted server-side (API)

### API & Communication Patterns

- REST API with OpenAPI spec (backend owned)
- Typed client generated in frontend via `openapi-typescript` `7.10.1`
- Standard error shape (problem+json style) + request IDs
- Rate limiting + webhook endpoints later for connectors

### Frontend Architecture

- Next.js app router
- State: server state via React Query; minimal client state in Zustand `5.0.9` only if needed
- Drilldowns share a single “explain this number” table component

### Infrastructure & Deployment

- Frontend: Vercel
- Backend: not Vercel (needs long-running server). Choose: Railway/Fly.io/AWS/ECS later
- Separate CI pipelines per repo; API publishes OpenAPI artifact used by web
