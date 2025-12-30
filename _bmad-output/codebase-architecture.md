# Budgetsimple - Codebase Architecture

**Date:** 2025-12-20

## High-Level

Budgetsimple is a browser-only SPA:

- UI is defined in `index.html` as a set of `<section class="view" data-view="...">` containers.
- Routing is implemented in `app.js` by toggling the active nav item and hiding/showing view sections.
- Data is local-first: IndexedDB stores the “rows” (transactions, income, envelopes); localStorage stores configuration (categories, rules, budgets, settings).

## Runtime Flow

1. `main()` loads/migrates local config and initializes category colors.
2. Storage selection:
   - Prefer IndexedDB via `DB` (database name `budgetsimple`, schema version 2).
   - If IndexedDB is unavailable/blocked, fall back to `LocalFallbackStore` (localStorage-backed).
3. Event wiring:
   - Navigation (`[data-route]`) updates route and calls `refreshAll()`.
   - Forms/actions (import, quick add, budgets, envelopes, settings) write to storage/config and then refresh.
4. Rendering:
   - `refreshAll()` loads data from the active store (`loadAllData(store)`), recomputes aggregates via `summarize(...)`, and renders each view’s UI.

## Storage Architecture

### localStorage (configuration)

- Key: `budgetsimple:v1`
- Stores:
  - `categories[]`, `rules[]`
  - `budgets` (by `categoryId`)
  - `settings` (currency, range prefs, accounts, UI prefs, etc.)

### IndexedDB (data rows)

- DB name: `budgetsimple`
- Version: `2`
- Object stores:
  - `transactions` (keyPath `id`)
  - `income` (keyPath `id`)
  - `envelopes` (keyPath `id`)
  - `envelopeContribs` (keyPath `id`, index `envelopeId`)
  - `meta` (keyPath `key`)

### Fallback store

If IndexedDB fails, `LocalFallbackStore` emulates the above stores using localStorage keys prefixed with `budgetsimple:fallback:`.

## UI / Routing Model

- Top-level nav routes (sidebar): `dashboard`, `activity`, `housing`, `plan`, `investing`.
- View sections (`data-view`) include:
  - `dashboard`
  - `transactions`, `income`, `import` (grouped under `activity`)
  - `budgets`, `envelopes` (grouped under `plan`)
  - `housing`, `investing`

## Data Pipeline

- Import:
  - CSV is parsed client-side, columns are mapped in UI, then rows are normalized into transaction/income objects.
  - Transactions include a `hash` used for duplicate detection.
- Summaries:
  - `summarize(...)` builds month/day aggregations and category breakdowns used by charts, budgets, and tables.
- Charts:
  - Charts are rendered to inline SVG elements built dynamically by JS.

---

_Generated using BMAD Method `document-project` workflow_
