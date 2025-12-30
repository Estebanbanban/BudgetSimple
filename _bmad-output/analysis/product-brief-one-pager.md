# Budgetsimple — Product Brief (One Pager, Draft)

**Owner:** Estebanronsin  
**Audience:** Self now → friends later (multi-user)  
**Positioning:** FIRE-oriented “one stop shop” for income, expenses, rent, and investing analysis that helps users reach financial goals.

---

## 1) Product Promise

Turn raw financial activity (spend, income, rent, investing) into a clear dashboard + cashflow map + plan (goals/envelopes + projections), so users can improve savings rate, understand where money goes, and reach financial objectives faster.

---

## 2) Target Users

- **Primary (now):** You (power user, FIRE-minded)
- **Secondary (later):** Friends and similar FIRE enthusiasts who want strong insights without spreadsheet pain

---

## 3) Core User Journey (North Star Flow)

1. **Connect** data (CSV now, broker/bank APIs later)  
2. **Normalize** (merchants, subscriptions, transfers, accounts, currencies)  
3. **Analyze** (dashboard metrics + trends + explanations + compounding projections)  
4. **Plan** (envelopes/goals + budgets + contribution plan)  
5. **Act** (recommendations + action items, benchmarking/gamification)

**First “Aha” moment:** after importing/syncing, the dashboard immediately shows meaningful visuals + insights without manual setup; customization comes second.

---

## 4) Product Pillars

### A) Dashboard-first Insights (Home)

Home must centralize key visuals and “so what” insights:

- Expense category pie + drilldown
- Cashflow map (“income → where it goes”): income sources → expense categories → savings/investing destinations (envelopes, accounts, brokerage)
- Month-over-month income vs expenses bars (and cashflow)
- Spending per day (trend + anomalies)
- Savings rate and % invested of net income (per month + over range)
- Net worth visualization + goal completion projection
- Rent analysis (budget vs actual + benchmark vs area)
- “Action items” panel (what to change next)
  - Examples: “Subscriptions up MoM”, “Rent above target”, “Low % invested this month”, “Top merchant spike”

Also include wealth-building lenses:

- Where do I spend the most?
- What subscriptions recur monthly?
- What’s my burn rate and runway?
- What is my net worth trend (assets + liabilities)?
- What is the projected effect of compounding if I keep current investing pace?

### B) Planning (Envelopes as Goals)

Envelope = savings goal (Dave Ramsey style): e.g., “Save $1500 for an iPhone.”

Required UX:

- A complete overview of all goals (progress, priority, ETA)
- Contribution plan (suggested monthly amount; user can set schedule)

Required forecasting:

- **Deterministic curve**: based on configured scheduled contributions
- **Historical curve**: based on past contributions (mathematical projection of “if you keep doing what you’ve been doing”)

### C) Investing (Brokerage accounts)

- Holdings + transactions import/sync
- Net worth integration
- % invested of net income tracking
- Later: allocation, performance, compounding analysis

### D) Benchmarks + Market Data

- **Anonymized benchmarks** (model C): compare against peers/targets without exposing identities
- Market data integrations (rent comps) with clear privacy boundaries

---

## 5) Key Metrics (what “good” looks like)

- Savings rate (primary)
- % invested of net income
- Net worth trend and goal completion
- Burn rate + runway
- Rent burden + benchmark vs area
- “Data health”: import coverage, duplicates, missing accounts/currencies

---

## 6) Non-Functional Requirements / Constraints

- **Platform:** Next.js web app (desktop-first)
- **Multi-currency:** required
- **External APIs:** required (brokerage + rent comps; bank later)
- **Security:** auth + secure DB (each user sees only their data in MVP)
- **Privacy:** benchmarking is anonymized/aggregated (no user-to-user data visibility in MVP)

---

## 7) MVP Strategy (two-phase, but “multi-user first”)

### MVP 1 (Multi-user foundation)

- Auth + per-user data isolation
- Core data model for transactions/income/investments/envelopes
- Dashboard-first home with explanations + drilldowns
- Envelope goals with deterministic + probabilistic forecast display

### MVP 2 (Connectors + Benchmarks)

- Brokerage holdings + transactions connectors (server-side)
- Rent benchmark integration (area-level)
- Anonymized benchmarks + gamification layer (opt-in)

---

## 8) Decisions

1. Benchmark cohorts: geography + income band + age band (privacy-preserving cohorts)
2. Envelope forecasting: no confidence bands; show scheduled plan vs historical projection (two curves)
3. Net worth scope: include full net worth (assets + liabilities)
4. Multi-currency: per-account/per-transaction currencies, with a user-selected display currency (FX conversion for reporting)
