---
stepsCompleted: [1]
inputDocuments:
  - "_bmad-output/analysis/product-brief-Budgetsimple-2025-12-20.md"
  - "_bmad-output/analysis/product-brief-one-pager.md"
  - "_bmad-output/analysis/brainstorming-session-2025-12-20T154326Z.md"
workflowType: "research"
lastStep: 1
research_type: "technical"
research_topic: "Canada + France: brokerage holdings/transactions, rent benchmarks, and FX data sources for Budgetsimple"
research_goals:
  - "Identify practical data source options for brokerage holdings + transactions for Canada and France"
  - "Identify rent benchmark datasets for Canada and France"
  - "Identify reliable FX sources and recommend a multi-currency modeling approach"
user_name: "Estebanronsin"
date: "2025-12-20T155518Z"
web_research_enabled: true
source_verification: true
---

# Technical Research — Budgetsimple (Canada + France): Brokerage + Rent + FX

This document focuses on the data layer needed to support Budgetsimple’s core dashboard/cashflow map for two initial markets (Canada and France): (1) brokerage holdings + transactions, (2) rent benchmarks, and (3) multi-currency FX conversion. It summarizes viable integration patterns and cites primary sources.

## Table of Contents

1. Scope and constraints  
2. Brokerage holdings + transactions (Canada + France)  
3. Rent benchmarks (Canada + France)  
4. FX sources (CAD/EUR and beyond)  
5. Recommended integration architecture (server-side)  
6. Open questions / decisions to confirm  

---

## 1) Scope and constraints

### Product constraints (from discovery)

- Multi-user web app, private-by-default: each user sees only their data.
- Canada + France are the first target markets.
- Must support:
  - brokerage holdings + transactions ingestion
  - rent benchmarking (local + cross-country comparisons)
  - multi-currency modeling (native currency per account/transaction, single display currency)

### Security constraint

Any connector requiring credentials/tokens must be server-side; the browser should never hold aggregator/broker secrets. (This is an architectural requirement of the product, not a vendor claim.)

---

## 2) Brokerage holdings + transactions (Canada + France)

There is no single universal “brokerage open banking” standard comparable to bank account PSD2 APIs for all brokers. Practically, you have three viable ingestion strategies:

1) **Broker-specific APIs** (best fidelity when available)  
2) **Investment aggregation APIs** (coverage vs vendor dependency tradeoff)  
3) **CSV import first** (reliable baseline; connectors added per market/provider)

### 2.1 Canada — aggregation option (broad coverage)

**Wealthica Investment API** positions itself as an aggregation API for Canadian financial institutions, brokerages, and investment platforms (“Connect to over 150 Canadian financial institutions…”) and provides developer-facing API access.  
Source: https://wealthica.com/investment-api/

How this helps Budgetsimple:
- One integration can cover multiple brokerages for holdings and transactions (depending on provider coverage and data granularity).
- Keeps your own connector surface smaller than “N broker APIs”.

What to validate (in a follow-up, provider-specific deep dive):
- Does the API reliably provide: holdings (positions), balances, transactions (buys/sells/dividends/fees), account metadata?
- How does it represent currencies per account/position/transaction?
- Data freshness model + webhooks/polling approach.

### 2.1b Canada — your initial broker priority list (implications)

You want first-class support for:

- Wealthsimple
- Questrade
- RBC Direct Investing

Practical implication: it’s unlikely you can cover all three with one “official” broker API integration. A realistic approach is:

- Ship brokerage ingestion as **CSV first** (works regardless of broker) to support your own needs immediately.
- Add connectors where public/contracted APIs exist (Questrade has API documentation; Saxo has OpenAPI docs; aggregators can provide broader coverage).
- Use an **investment aggregation provider** where it provides your needed holdings + transaction fidelity (and covers brokers without public APIs).

### 2.1c Canada — broker-specific API (Questrade)

Questrade publishes API documentation and a “Getting Started” flow for creating apps as a Questrade client.  
Sources:
- API landing page: https://www.questrade.com/api  
- Getting started: https://www.questrade.com/api/documentation/getting-started

This is a strong candidate for a Canada-native connector for holdings and transaction activity (subject to validating exact endpoints and quotas during implementation).

### 2.2 Canada — open banking status (banking, not brokerage)

Canada’s open banking program is described by the Financial Consumer Agency of Canada (FCAC). This is relevant for bank transaction ingestion and future expansion, but it is not a guarantee of brokerage holdings/transactions access.  
Source: https://www.canada.ca/en/financial-consumer-agency/services/banking/open-banking.html

### 2.3 France/EU — PSD2 enables bank account access (not a brokerage guarantee)

In the EU, PSD2 is the baseline legal framework enabling third-party access to payment account data via regulated providers (for accounts/transactions/payments). This is critical for future bank connectors and “cash” net worth components, but brokerage holdings/transactions often remain broker-specific or aggregator-specific.  
Source (PSD2 text): https://eur-lex.europa.eu/eli/dir/2015/2366/oj

### 2.4 France/EU — bank aggregation / open banking providers

For France/EU bank connectivity, vendors like Bridge provide open banking solutions and publish integration/API references. (This supports bank accounts/transactions; you still need a plan for brokerage holdings/transactions.)  
Sources:
- Bridge homepage (open banking positioning): https://www.bridgeapi.io/  
- Bridge docs entrypoints: https://docs.bridgeapi.io/docs/quickstart and https://docs.bridgeapi.io/reference/

### 2.4b France — your initial broker priority list (implications)

You want first-class support for:

- Boursorama
- Trade Republic
- Saxo Bank

Implication: start with a split strategy:

- **Saxo Bank:** prioritize a connector using Saxo’s OpenAPI documentation (below).
- **Boursorama + Trade Republic:** treat as CSV-first and/or aggregator-provided coverage until an official integration route (partner/enterprise/aggregator) is confirmed.

### 2.5 Broker-specific API baseline (works in both markets if the broker is supported)

Interactive Brokers (IBKR) publishes API documentation for its TWS API. This can serve as an early “brokerage connector” if you (or your users) use IBKR in Canada and/or France.  
Source: https://interactivebrokers.github.io/tws-api/

### 2.5b France — broker-specific API (Saxo OpenAPI)

Saxo provides a developer portal and OpenAPI reference docs.  
Sources:
- Saxo developer portal: https://www.developer.saxo/  
- OpenAPI reference docs: https://www.developer.saxo/openapi/referencedocs

This is a strong candidate for a France-compatible “brokerage connector” path (subject to account eligibility, licensing, and auth model).

### 2.6 Recommended brokerage ingestion path (Canada + France)

**Suggested staged approach (technical):**

- Stage A (immediately shippable): CSV import of brokerage transactions + periodic holdings snapshots.
- Stage B (Canada connector): integrate Wealthica Investment API for broad Canadian brokerage coverage.  
  Source: https://wealthica.com/investment-api/
- Stage C (France/EU connectors): start with bank open banking (Bridge or similar) for cashflow and net worth “cash accounts”; add broker coverage via:
  - broker-specific APIs where available, and/or
  - a France/EU investment aggregation provider you can verify and contract with.
  Sources for bank open banking baseline: PSD2 (https://eur-lex.europa.eu/eli/dir/2015/2366/oj), Bridge (https://www.bridgeapi.io/, https://docs.bridgeapi.io/reference/)

Given your initial broker priorities:
- Canada: implement Questrade API connector early; use CSV and/or an investment aggregation provider to cover Wealthsimple and RBC Direct Investing if needed.
- France: implement Saxo OpenAPI connector early; use CSV/aggregator for Boursorama and Trade Republic until an official integration route is confirmed.

---

## 3) Rent benchmarks (Canada + France)

Rent benchmarking should be treated as a **separate dataset** from the user’s own transactions:

- User’s rent payment(s) come from transactions (or a “virtual rent” if missing).
- Benchmarks come from public datasets and are joined by geography (and optionally unit type, size, etc.).

### 3.1 Canada — national/official housing market sources

CMHC provides rental market data tables, which are a strong foundation for Canadian rent benchmarks.  
Source: https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market

Notes for implementation:
- Decide your minimum geographic key: city/metro/region vs postal/forward sortation area (FSA).
- Validate whether CMHC tables cover your intended granularity and whether you need supplemental sources.

### 3.2 France — commune-level rent indicators (dataset)

France’s `data.gouv.fr` catalog includes the “Carte des loyers” datasets with commune-level rent indicators and downloadable CSV resources plus methodology docs.  
Sources:
- Dataset page: https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025  
- Methodology note (PDF): https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/20251211-145128/note-methodologique.pdf  
- Example resource (CSV, apartments): https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/20251211-145010/pred-app-mef-dhup.csv

The `data.gouv.fr` API can be used to discover and version datasets programmatically.  
Source (example query used): https://www.data.gouv.fr/api/1/datasets/?q=loyers&page_size=5

### 3.2b Rent benchmark granularity (your requirement)

You want:
- Canada: **city-level** benchmarks
- France: **city-level**, and for Paris specifically **arrondissement + neighborhood** when possible

What’s directly supported by sources already validated in this pass:
- The France “Carte des loyers” datasets are explicitly **commune-level** (city/commune).  
  Source: https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025

Paris arrondissement/neighborhood support is not guaranteed by commune-level datasets, so treat this as a follow-up sourcing task:
- Design your benchmark model to support multiple geo levels (country → city/commune → district/neighborhood).
- For Paris, add a second enrichment dataset/source when selected and validated.

### 3.3 Cross-country comparisons (France vs Canada)

Cross-country benchmarking needs consistent normalization:
- choose a display currency (e.g., CAD or EUR) and convert benchmark series using FX rates (see section 4),
- choose comparable geography (city/metro vs commune) and housing type (apartment/house, size buckets),
- clearly label benchmark limitations and methodology differences (e.g., listing rent vs signed lease rent).

---

## 4) FX sources (CAD/EUR and beyond)

Budgetsimple’s requirement is:
- keep original currencies per account/transaction,
- choose a single display currency for dashboards,
- convert at aggregation time with recorded “as-of” FX rates.

### 4.1 EUR reference rates (ECB)

The ECB publishes euro foreign exchange reference rates and provides a daily XML feed.  
Sources:
- Human-readable page: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html  
- Daily XML feed: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml

### 4.2 CAD reference rates (Bank of Canada)

The Bank of Canada provides the Valet API documentation and JSON endpoints for FX observations such as USD/CAD.  
Sources:
- Valet API docs: https://www.bankofcanada.ca/valet/docs  
- Example observations endpoint (USD/CAD): https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1

Implementation implications:
- Choose a canonical internal FX table format (base currency, quote currency, date, value, provider).
- For conversions between non-base currencies, derive cross-rates consistently (e.g., via EUR or USD pivots) and record derivation.

---

## 5) Recommended integration architecture (server-side)

### 5.1 Core pattern

- **Frontend (Next.js):** UI, dashboards, interactive cashflow map, onboarding.
- **Backend (Next.js API routes / serverless / worker):**
  - broker/aggregator connector orchestration
  - token storage + encryption at rest
  - scheduled refresh jobs + webhooks handlers (where supported)
- **Database (per-user isolation):** transactions, accounts, holdings snapshots, envelopes/goals, exchange rates, benchmark datasets (normalized).

### 5.2 Normalized tables (minimal)

- `accounts` (user_id, provider, native_currency, type)
- `transactions` (user_id, account_id, amount, currency, date, category, merchant, type)
- `holdings` (user_id, account_id, symbol, quantity, price, currency, as_of)
- `fx_rates` (provider, base, quote, date, rate)
- `rent_benchmarks` (country, geo_key, unit_type, size_bucket, currency, period, value, source_ref)

---

## 6) Open questions / decisions to confirm (collaborative)

1) **Broker coverage priority list** (Canada + France): which brokerages should be supported first?  
2) **Rent geo model**: what geo keys do we standardize on for Canada and France (city, postal, commune, neighborhood)?  
3) **FX policy**: do we convert at daily rates, monthly average, or “as-of transaction date” for dashboards?  
4) **Benchmark privacy**: what minimum cohort sizes do we require before showing cohort benchmark comparisons?
