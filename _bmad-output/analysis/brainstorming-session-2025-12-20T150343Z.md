---
stepsCompleted:
  - "session-setup"
  - "idea-generation"
  - "idea-organization"
inputDocuments:
  - "README.md"
  - "index.html"
  - "app.js"
  - "styles.css"
session_topic: "Budgetsimple: local-first budget & investing tracker"
session_goals:
  - "Clarify target users and pain points"
  - "Identify highest-leverage feature improvements"
  - "Outline a safe path to cloud sync (optional)"
  - "Define research questions to validate next"
selected_approach: "progressive-flow"
techniques_used:
  - "How might we"
  - "Constraint-driven ideation"
  - "Assumption busting"
ideas_generated: []
context_file: "_bmad/bmm/data/project-context-template.md"
---

# Brainstorming Session Results

**Facilitator:** Estebanronsin  
**Date:** 2025-12-20

## 1) Problem Statements (hypotheses)

- People want a dead-simple, private budget tracker that does not require accounts or subscriptions.
- CSV import from banks/brokers is painful: inconsistent columns, duplicate rows, and messy merchant strings create high setup friction.
- Budgeting needs are periodic (month-based), but real cashflow and “envelope” goals cut across months and accounts.
- Users want basic investing tracking (how much they invest, by category/instrument), without full portfolio management complexity.

## 2) Target Users (initial segmentation)

- **Privacy-first solo users:** want local-only, no login, fast import, good charts.
- **Power budgeters:** want rules, splits, transfers, better categories, envelope automation.
- **Cloud-sync users (optional path):** want multi-device access + backup with minimal friction.

## 3) Opportunity Areas

### Import + Data Quality

- “Smart mapping” presets for popular banks (save mappings by file signature).
- Stronger duplicate handling: show duplicates, import all/skip, and “merge” options.
- Merchant cleanup: rules for renaming/normalizing merchants; vendor aliasing.
- Transaction type inference improvements (sign, keywords, column heuristics).

### Budgeting + Planning

- Budget templates (e.g., 50/30/20, zero-based, envelope-first).
- Carry-over budgets (rollover), and mid-month budget edits without losing history.
- Better transfer handling (exclude from spend), including account-to-account transfers.
- Alerts: at 80% / 100% (already exists) + notifications and “projected overspend” warnings.

### Envelopes (Savings Goals)

- Auto-contribution rules: “allocate X% of income” or “allocate fixed amount on payday”.
- Envelope-to-budget integration: treat envelopes as planned savings (reduces available-to-spend).
- Better projection model: allow “monthly contribution target” and show required amount to hit target by a chosen date.

### Investing

- Better instrument taxonomy (brokerage vs retirement vs crypto already present as categories).
- Add “investment accounts” list with basic performance placeholders (without market price tracking yet).
- Import support for broker CSV (separate import pipeline from bank transactions).

### UX / Trust / Safety

- Onboarding flow: guide import → categorize top merchants → set budgets → set savings target.
- “Explain this number” affordances: click any dashboard number to see contributing rows.
- Data portability: full export (all stores) + import backup.

## 4) “Cloud Mode” Path (optional, from README direction)

- Keep local-first as default, add **optional sync**:
  - Auth: Google login
  - Storage: Postgres (e.g., Supabase) with Row Level Security
  - Sync strategy: local write → background push; conflict policy per table
  - Never put provider secrets in the browser (Plaid/Powens/finAPI must be server-side)

## 5) Key Risks / Open Questions

- What’s the primary success metric: daily active usage, correctness of categorization, or “budget adherence” outcomes?
- Should transfers be first-class (with paired entries) or derived heuristics?
- Cloud sync scope: full fidelity (transactions + envelopes + budgets + rules) vs “backup only” export/import.
- Privacy expectations: if cloud sync exists, how do we communicate encryption / data ownership?

## 6) Candidate Epics (draft)

- Import UX improvements (mapping presets, dedupe UX, merchant normalization)
- Budgeting depth (rollover, transfer handling, budget history)
- Envelope automation (payday rules, projections, integration with budgets)
- Multi-device backup/sync (optional)
- Export/import backup bundle (local-first robustness)

## 7) Recommended Next Steps

1. Run `research` to validate target users and comparable products (especially local-first vs cloud).
2. Create a PRD scoped to the next milestone (e.g., “Import + data quality” or “Sync MVP”).

