# Story 5.2: Cashflow Map Page with Interactive Nodes

Status: ready-for-dev

## Story

As a user,
I want a dedicated cashflow map page,
so that I can understand "where my money goes" visually.

## Acceptance Criteria

1. Given I have imported transactions, when I open the Cashflow Map page for a time range, then I see a flow visualization with proportional edges, nodes and edges are clickable and keyboard accessible, and deep links from "Explain this number" highlight/zoom to the relevant node(s).

## Tasks / Subtasks

- [ ] Implement cashflow map visualization component (AC: 1)
  - [ ] Choose visualization library (e.g., D3.js Sankey, React Flow, or custom SVG)
  - [ ] Create `CashflowMap` component that renders flow graph
  - [ ] Render nodes (sources and sinks) with labels and amounts
  - [ ] Render edges (flows) with proportional widths based on amounts
  - [ ] Apply color coding: income (green), expenses (red), savings (blue), transfers (yellow), etc.
  - [ ] Ensure responsive layout (works on desktop, adapts to smaller screens)
- [ ] Add interactivity to nodes and edges (AC: 1)
  - [ ] Make nodes clickable (triggers drilldown - see Story 5.3)
  - [ ] Make edges clickable (shows flow details)
  - [ ] Add hover states (highlight node/edge, show tooltip with amount)
  - [ ] Add keyboard navigation (Tab to focus nodes, Enter to select, Arrow keys to navigate)
  - [ ] Add focus indicators for accessibility
- [ ] Implement time range selection (AC: 1)
  - [ ] Add range picker UI (reuse from dashboard if available)
  - [ ] Fetch cashflow data for selected range via `/api/cashflow/compute`
  - [ ] Update visualization when range changes
  - [ ] Show loading state while fetching
- [ ] Implement deep linking from "Explain this number" (AC: 1)
  - [ ] Support URL params: `/cashflow?highlight=node-id&range=month`
  - [ ] Parse highlight param and zoom/highlight relevant node(s)
  - [ ] Update visualization to show highlighted nodes (e.g., stroke, glow effect)
  - [ ] Scroll/pan to bring highlighted nodes into view
  - [ ] Clear highlight when user clicks elsewhere or uses "Clear drilldown" button
- [ ] Add pan and zoom controls (AC: 1)
  - [ ] Implement pan (drag to move viewport)
  - [ ] Implement zoom (mouse wheel or pinch gesture)
  - [ ] Add "Center" button to reset view
  - [ ] Add zoom controls (zoom in/out buttons)
  - [ ] Persist view state in URL or session storage (optional)
- [ ] Add empty state handling (AC: 1)
  - [ ] Show "No data yet" message when no transactions in range
  - [ ] Show helpful message directing user to import data
  - [ ] Link to Connect/Import page

## Dev Notes

- The cashflow map page is at `/cashflow` (already scaffolded in Story 1.1).
- Visualization should be performant: render smoothly with up to 50 nodes and 100 edges.
- Use the flow graph structure from Story 5.1 backend endpoint.
- Color scheme should match dashboard (green for positive/savings, red for expenses, etc.).
- Accessibility: ensure WCAG 2.1 AA compliance (keyboard navigation, screen reader support, focus indicators).
- The visualization should be exportable (PNG/SVG) - add export button (reuse pattern from dashboard).

### References

- Epic and story definition: `_bmad-output/epics.md` (Epic 5, Story 5.2)
- Story 5.1: `_bmad-output/implementation-artifacts/5-1-cashflow-classification-rules-and-flow-graph-computation.md`
- Story 3.2: Universal "Explain This Number" Drilldown (for deep linking integration)
- Sprint tracking statuses: `_bmad-output/implementation-artifacts/sprint-status.yaml`



