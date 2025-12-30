# Story 5.4: Cashflow Narrative Summaries

Status: ready-for-dev

## Story

As a user,
I want short textual summaries of my cashflow,
so that I can grasp the biggest drivers without reading every transaction.

## Acceptance Criteria

1. Given the cashflow map is computed, when I view the summaries section, then I see "top sinks", "top savings destinations", and "unallocated" highlights, and each summary item links to its drilldown.

## Tasks / Subtasks

- [ ] Design narrative summary algorithm (AC: 1)
  - [ ] Define summary types: top sinks, top savings destinations, unallocated
  - [ ] Define ranking criteria (by amount, by % of income, by trend)
  - [ ] Define summary text templates (e.g., "Your largest category is {category} with {amount} across {merchant_count} merchants")
  - [ ] Define when to show each summary type (e.g., only show unallocated if >5% of income)
- [ ] Implement backend narrative generation endpoint (AC: 1)
  - [ ] Create `/api/cashflow/narrative` endpoint (GET with time range)
  - [ ] Compute top sinks: rank expense categories/merchants by total amount
  - [ ] Compute top savings destinations: rank envelopes/investing by total amount
  - [ ] Compute unallocated: calculate leftover cashflow (income - expenses - savings - investing)
  - [ ] Generate summary text for each type using templates
  - [ ] Return summaries array with: type, title, text, amount, node ID (for drilldown link)
  - [ ] Add OpenAPI schema and regenerate frontend types
- [ ] Create narrative summaries UI component (AC: 1)
  - [ ] Create `CashflowNarrative` component (or section in cashflow page)
  - [ ] Display summaries as action-item style cards (reuse from dashboard action items)
  - [ ] Show summary title, text, and amount
  - [ ] Add "Drill down" button for each summary (links to node drilldown)
  - [ ] Handle empty state (no summaries to show)
  - [ ] Show loading state while fetching
- [ ] Implement "Top sinks" summary (AC: 1)
  - [ ] Show top 3-5 expense categories/merchants
  - [ ] Display: category/merchant name, total amount, % of total expenses
  - [ ] Include merchant count if category has multiple merchants
  - [ ] Link to category/merchant drilldown when clicked
- [ ] Implement "Top savings destinations" summary (AC: 1)
  - [ ] Show top 3-5 savings destinations (envelopes, investing accounts)
  - [ ] Display: destination name, total amount, % of income
  - [ ] Show progress vs plan if envelope has a plan (from Epic 6)
  - [ ] Link to destination drilldown when clicked
- [ ] Implement "Unallocated" summary (AC: 1)
  - [ ] Calculate unallocated: income - expenses - savings - investing - transfers
  - [ ] Show unallocated amount and % of income
  - [ ] Show message: "Allocate the remaining cashflow to reduce idle funds" or similar
  - [ ] Link to unallocated drilldown (shows transactions that contribute to unallocated)
  - [ ] Only show if unallocated > threshold (e.g., 5% of income or $100)
- [ ] Add narrative refresh on range change (AC: 1)
  - [ ] Re-fetch narratives when time range changes
  - [ ] Update summaries to reflect new range
- [ ] Add narrative export (optional enhancement)
  - [ ] Export summaries as text or markdown
  - [ ] Add "Export summary" button

## Dev Notes

- Narrative summaries should be concise: 1-2 sentences per summary.
- Summaries should be actionable: each summary should suggest a next step or insight.
- The summaries should update when the cashflow map is filtered or when a node is selected (show summaries in context of selection).
- Use natural language that's easy to understand (avoid financial jargon where possible).
- The narrative section is already scaffolded in the cashflow page (`/cashflow`) - update the existing placeholder content.

### References

- Epic and story definition: `_bmad-output/epics.md` (Epic 5, Story 5.4)
- Story 5.1: `_bmad-output/implementation-artifacts/5-1-cashflow-classification-rules-and-flow-graph-computation.md`
- Story 5.2: `_bmad-output/implementation-artifacts/5-2-cashflow-map-page-with-interactive-nodes.md`
- Story 5.3: `_bmad-output/implementation-artifacts/5-3-cashflow-drilldowns-and-cross-filtering.md`
- Story 3.3: Action Items Panel (for UI pattern reference)
- Sprint tracking statuses: `_bmad-output/implementation-artifacts/sprint-status.yaml`



