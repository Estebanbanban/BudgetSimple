# Story 5.3: Cashflow Drilldowns and Cross-Filtering

Status: ready-for-dev

## Story

As a user,
I want to click a node and see the contributing transactions,
so that I can investigate and take action.

## Acceptance Criteria

1. Given I am viewing the cashflow map, when I click a node (e.g., "Groceries" or "Transfers"), then I see a drilldown list of contributing transactions and totals, other supporting panels on the page update consistently to match the selection, and savings rate explain shows the % and the savings buckets (envelopes, investing, unallocated).

## Tasks / Subtasks

- [ ] Implement node click handler and drilldown state (AC: 1)
  - [ ] Add click handler to cashflow map nodes
  - [ ] Store selected node in component state (node ID, type, filters)
  - [ ] Highlight selected node in visualization (different from hover)
  - [ ] Show "Clear drilldown" button when a node is selected
  - [ ] Clear selection when "Clear drilldown" is clicked
- [ ] Create drilldown transactions table component (AC: 1)
  - [ ] Create `CashflowDrilldown` component (or section in cashflow page)
  - [ ] Fetch transactions for selected node via backend endpoint (e.g., `/api/cashflow/drilldown?node=...&range=...`)
  - [ ] Display transactions table: date, description, merchant, category, amount, account
  - [ ] Show total amount for selected node (reconciles to node value in map)
  - [ ] Add pagination if transaction count is large (>100)
  - [ ] Show empty state if no transactions match
- [ ] Implement backend drilldown endpoint (AC: 1)
  - [ ] Create `/api/cashflow/drilldown` endpoint (GET with node ID + time range)
  - [ ] Query transactions filtered by node criteria (category, merchant, type, etc.)
  - [ ] Apply user-scoped RLS (only user's transactions)
  - [ ] Convert amounts to display currency using as-of FX rates
  - [ ] Return transactions array + total amount
  - [ ] Add OpenAPI schema and regenerate frontend types
- [ ] Implement cross-filtering for supporting panels (AC: 1)
  - [ ] Update "Top sinks" table to highlight selected node if it's a sink
  - [ ] Update "Top savings destinations" table to highlight selected node if it's a savings destination
  - [ ] Update "Unallocated" section if selected node is unallocated
  - [ ] Update narrative summaries to emphasize selected node context
  - [ ] Ensure all panels use the same time range filter
- [ ] Implement savings rate explain view (AC: 1)
  - [ ] When selected node is "Savings Rate" or savings-related, show savings breakdown
  - [ ] Display savings rate percentage
  - [ ] Show breakdown table: envelopes (amount, %), investing (amount, %), unallocated (amount, %)
  - [ ] Each breakdown row links to its drilldown
  - [ ] Reconcile totals: envelopes + investing + unallocated = total savings
- [ ] Add keyboard shortcuts for drilldown (AC: 1)
  - [ ] Escape key clears selection
  - [ ] Arrow keys navigate between nodes (if implemented)
  - [ ] Enter key selects focused node
- [ ] Add export functionality for drilldown (AC: 1)
  - [ ] Export selected node's transactions as CSV
  - [ ] Add "Export CSV" button in drilldown section

## Dev Notes

- The drilldown should be fast: <200ms to show transactions for a selected node.
- Transaction table should support sorting (by date, amount, merchant).
- The drilldown section should be collapsible/expandable to save screen space.
- Deep linking: when a node is selected, update URL to include `?node=node-id` for shareability.
- The drilldown should work seamlessly with the "Explain this number" flow from Story 3.2 (dashboard → cashflow map with pre-selected node).

### References

- Epic and story definition: `_bmad-output/epics.md` (Epic 5, Story 5.3)
- Story 5.1: `_bmad-output/implementation-artifacts/5-1-cashflow-classification-rules-and-flow-graph-computation.md`
- Story 5.2: `_bmad-output/implementation-artifacts/5-2-cashflow-map-page-with-interactive-nodes.md`
- Story 3.2: Universal "Explain This Number" Drilldown (integration point)
- Sprint tracking statuses: `_bmad-output/implementation-artifacts/sprint-status.yaml`



