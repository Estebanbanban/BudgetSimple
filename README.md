# Budgetsimple

## MVP: Local-First Architecture

**The MVP is local-first. All analytics, insights, and subscription detection work from IndexedDB (browser storage). The backend is optional and only used when explicitly enabled.**

- **Source of Truth:** IndexedDB (browser local storage)
- **Backend:** Optional, feature-flagged
- **Immediate Value:** Insights work right after CSV import, no backend setup required

See [docs/MVP-LOCAL-FIRST.md](./docs/MVP-LOCAL-FIRST.md) and [docs/00_START_HERE.md](./docs/00_START_HERE.md) for details.

--- (planning workspace)

This folder contains BMAD Method artifacts and project planning outputs for **Budgetsimple**.

## App Repos (local folders)

- Frontend: `budgetsimple-web/`
- Backend API: `budgetsimple-api/`

## Run locally

API:

```bash
cd budgetsimple-api
cp .env.example .env
npm install
npm run dev
```

Web:

```bash
cd budgetsimple-web
cp .env.example .env.local
npm install
npm run gen:api
npm run dev
```

