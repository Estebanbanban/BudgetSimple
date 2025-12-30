# Budgetsimple - Source Tree Analysis

**Date:** 2025-12-20

## Overview

This is a small static SPA. The runtime entry point is `index.html`, which loads `styles.css` and the single JavaScript bundle `app.js`. Example data is provided in `samples/`.

## Complete Directory Structure

```
.
├── README.md
├── app.js
├── index.html
├── logo.png
├── styles.css
├── samples/
│   ├── income.csv
│   └── transactions.csv
├── _bmad/               (BMAD installed workflows/agents)
├── _bmad-output/        (BMM workflow tracking + generated docs)
└── BMAD-METHOD/         (vendored BMAD Method source)
```

## Critical Paths

### `index.html`

**Purpose:** Declares the app shell and all view sections.
**Contains:** Navigation buttons (`data-route=...`) and view containers (`data-view=...`) that are shown/hidden by JS.

### `app.js`

**Purpose:** Application logic.
**Contains:** Storage layer (IndexedDB + fallback), CSV parsing/import, aggregation, routing, and all rendering functions.

### `styles.css`

**Purpose:** App styling.
**Contains:** Layout, components, responsive behavior, and UI polish.

### `samples/`

**Purpose:** Quick-start CSVs for import testing.

### `_bmad-output/`

**Purpose:** BMM workflow outputs (including `bmm-workflow-status.yaml` and these docs).

## Entry Points

- **Main Entry:** `index.html`
- **Main Script:** `app.js`

## Configuration Files

- `README.md`: how to run and what data storage is used
- `_bmad-output/bmm-workflow-status.yaml`: BMAD workflow tracking for this repo

---

_Generated using BMAD Method `document-project` workflow_

