# Budgetsimple - Development Guide

**Date:** 2025-12-20

## Local Development

This is a static site (no install step).

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Trying the App

- Use **Import** with `samples/transactions.csv`
- Optionally import `samples/income.csv` (or add income rows manually)
- Use **Reset** to clear all local data for this app on your device

## Data Storage Notes

- Primary: IndexedDB (database `budgetsimple`)
- Config: localStorage key `budgetsimple:v1`
- Fallback: localStorage keys prefixed with `budgetsimple:fallback:` if IndexedDB is blocked/unavailable

## Common Dev Tasks

- UI changes: edit `index.html` and `styles.css`
- Logic changes: edit `app.js`
- Debugging: open browser DevTools console; the app uses `toast(...)` plus console logging for certain failures

---

_Generated using BMAD Method `document-project` workflow_

