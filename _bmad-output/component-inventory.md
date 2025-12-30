# Budgetsimple - Component Inventory

**Date:** 2025-12-20

This project is not componentized into separate files; most “components” are DOM sections and render functions inside `app.js`.

## Views (from `index.html`)

- `dashboard`: summary cards, category pie, month-over-month charts, investing chart, budgets progress, top merchants, daily spending
- `transactions`: transaction table with filters/search and inline edits
- `income`: income table and manual income entry
- `import`: CSV upload + column mapping + preview for transactions and income
- `budgets`: budgets table + rent budget helper
- `envelopes`: envelope cards, combined progress, envelope detail modal (chart + contribution table)
- `housing`: housing-related planning (rent vs own)
- `investing`: investment breakdown + table

## Key Render Functions (from `app.js`)

- Aggregation: `summarize(...)`
- Tables: `renderTable(...)`
- Dashboard charts: `renderPieChart(...)`, `renderMoMBars(...)`, `renderMoMCashflow(...)`, `renderMoMStackedExpenses(...)`, `renderDailySpending(...)`, `renderFlowSankey(...)`
- Budgets: `renderBudgetProgress(...)`, `renderBudgetsTable(...)`
- Envelopes: `renderEnvelopes(...)`, `renderEnvelopeModal(...)`

## Modals / Overlays

- Settings modal (`#settings`)
- Envelope modal (`#envelopeModal`)

---

_Generated using BMAD Method `document-project` workflow_

