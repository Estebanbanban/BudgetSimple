# Story 5.1: Cashflow Classification Rules and Flow Graph Computation

Status: ready-for-dev

## Story

As a developer,
I want deterministic rules to classify transactions and compute a flow graph,
so that the cashflow map matches the dashboard and remains explainable.

## Acceptance Criteria

1. Given a selected time range and a set of transactions, when the cashflow computation runs, then it produces a flow graph: income sources → sinks (categories/merchants/subscriptions/envelopes/investing/liabilities/transfers/unallocated), transfers are represented as a category in the map, and split transactions and investment buy/sell transactions are excluded from the cashflow map.

## Tasks / Subtasks

- [ ] Design cashflow classification algorithm (AC: 1)
  - [ ] Define transaction type classification rules (income, expense, transfer, investment buy/sell, split)
  - [ ] Document exclusion rules: split transactions and investment buy/sell are excluded
  - [ ] Document inclusion rules: transfers shown as a category
  - [ ] Define flow graph data structure (nodes: sources/sinks, edges: flows with amounts)
- [ ] Implement backend cashflow computation endpoint (AC: 1)
  - [ ] Create `/api/cashflow/compute` endpoint (POST with time range + optional filters)
  - [ ] Query transactions for the time range (user-scoped, RLS enforced)
  - [ ] Apply classification rules to filter and categorize transactions
  - [ ] Aggregate flows: group by source → destination pairs
  - [ ] Compute totals per node (income sources, expense categories, envelopes, investing, liabilities, transfers, unallocated)
  - [ ] Return flow graph JSON: nodes array + edges array with amounts
- [ ] Add OpenAPI schema for cashflow computation (AC: 1)
  - [ ] Document request schema (time range, optional filters)
  - [ ] Document response schema (flow graph structure)
  - [ ] Update OpenAPI spec and regenerate frontend types
- [ ] Add unit tests for classification rules (AC: 1)
  - [ ] Test income transaction classification
  - [ ] Test expense transaction classification
  - [ ] Test transfer transaction classification (should be included as category)
  - [ ] Test split transaction exclusion
  - [ ] Test investment buy/sell exclusion
  - [ ] Test flow graph aggregation correctness

## Dev Notes

- Cashflow allocation rules (from PRD open question answer): transfers shown as a category; split transactions and investment buy/sell not included in cashflow map.
- Flow graph structure should support:
  - Nodes: each unique source (income type) or sink (category/merchant/subscription/envelope/investing/liability/transfer/unallocated)
  - Edges: directed flows from source to sink with amount (in display currency, converted using as-of FX rates)
- The computation should be deterministic and explainable: each edge amount should reconcile to specific transactions that can be listed.
- Performance: for typical personal datasets, computation should complete in <500ms.
- This story focuses on backend computation only; visualization comes in Story 5.2.

### References

- Epic and story definition: `_bmad-output/epics.md` (Epic 5, Story 5.1)
- PRD cashflow allocation rules: `_bmad-output/project-planning-artifacts/prd.md` (Section 9, Open Question 1)
- Sprint tracking statuses: `_bmad-output/implementation-artifacts/sprint-status.yaml`
