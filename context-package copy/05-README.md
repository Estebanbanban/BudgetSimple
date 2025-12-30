# Budgetsimple (planning workspace)

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

