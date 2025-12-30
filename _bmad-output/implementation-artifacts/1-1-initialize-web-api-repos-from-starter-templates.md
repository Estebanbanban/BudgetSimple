# Story 1.1: Initialize Web + API Repos from Starter Templates

Status: review

## Story

As a developer,
I want to initialize the frontend and backend repos from known starter templates,
so that the team can build features on a consistent, repeatable foundation.

## Acceptance Criteria

1. Given a clean git workspace for two separate repos, when I initialize `budgetsimple-web` with the selected Next.js template and `budgetsimple-api` with the selected Fastify template, then both projects start locally with default routes/health checks, and each repo has a documented local run command and environment variable stub files.
2. Given the architecture requirement for an API contract, when the backend exposes an initial OpenAPI spec (even for a simple health endpoint), then the frontend can generate a typed client from that OpenAPI artifact.

## Tasks / Subtasks

- [ ] Create the two repos (`budgetsimple-web`, `budgetsimple-api`) (AC: 1)
  - [ ] Initialize Next.js app (TypeScript, ESLint, Tailwind, App Router, src-dir, `@/*` alias) using the pinned version from architecture
  - [ ] Initialize Fastify app using the pinned version from architecture
  - [ ] Add `README.md` run instructions in each repo (install, dev, build)
  - [ ] Add `.env.example` in each repo (no secrets committed)
- [ ] Establish backend OpenAPI output (AC: 2)
  - [ ] Add a `GET /health` endpoint
  - [ ] Add Swagger/OpenAPI generation (`@fastify/swagger` + `@fastify/swagger-ui`)
  - [ ] Ensure OpenAPI is accessible at a stable URL (e.g., `/openapi.json`)
- [ ] Establish frontend typed client generation (AC: 2)
  - [ ] Add a small script to generate types via `openapi-typescript` from the backend OpenAPI URL (local dev)
  - [ ] Commit generated types to the repo OR document a deterministic generation step (decide and document)
  - [ ] Prove usage with a trivial typed call wrapper (does not need to hit the network in prod yet)

## Dev Notes

- Repo topology is explicitly **two repos**, not a monorepo: `budgetsimple-web` (Next.js) and `budgetsimple-api` (Fastify).
- API contract strategy: backend is source of truth for OpenAPI; frontend generates a typed client from OpenAPI (`openapi-typescript`).
- Keep Story 1.1 minimal: do not add unrelated domain tables/models here; those come when first needed by later stories.
- Network: any tooling that fetches OpenAPI over HTTP should work in local dev; for CI you may prefer generating from a checked-in `openapi.json` artifact.
- Implementation note: `create-fastify@5.0.0` requires Node `>=20.19.0`; this workspace is on Node `v20.17.0`, so `create-fastify@4.1.0` was used and the API uses Fastify v4-compatible Swagger plugins.

### Project Structure Notes

- This repository (`/Users/estebanronsin/Desktop/Coding/Cursor/Test`) currently holds BMAD artifacts and planning docs; the actual app repos will be created separately as per architecture.

### References

- Architecture decisions (two repos, pinned init commands, OpenAPI contract): `_bmad-output/architecture.md`
- Epic and story definition: `_bmad-output/epics.md` (Epic 1, Story 1.1)
- Sprint tracking statuses: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex CLI)

### Debug Log References

### Completion Notes List

1. Scaffolded `budgetsimple-web` (Next.js 16.1.0) and `budgetsimple-api` (Fastify) as separate repos/folders.
2. Added API health endpoint (`GET /health`), OpenAPI JSON (`GET /openapi.json`), and Swagger UI (`GET /docs`).
3. Added OpenAPI dump script (`npm run openapi:dump`) and frontend type generation (`npm run gen:api`) targeting `src/lib/api/openapi.ts`.
4. Added initial app shell pages (Dashboard, Cashflow Map, Plan, Investing, Connect, Settings) as placeholders for upcoming stories.

### File List

- `budgetsimple-api/package.json`
- `budgetsimple-api/plugins/swagger.js`
- `budgetsimple-api/routes/health.js`
- `budgetsimple-api/scripts/dump-openapi.js`
- `budgetsimple-api/openapi.json`
- `budgetsimple-api/test/routes/health.test.js`
- `budgetsimple-api/.env.example`
- `budgetsimple-api/README.md`
- `budgetsimple-web/package.json`
- `budgetsimple-web/.env.example`
- `budgetsimple-web/src/lib/api/openapi.ts`
- `budgetsimple-web/src/app/layout.tsx`
- `budgetsimple-web/src/app/page.tsx`
- `budgetsimple-web/src/app/dashboard/page.tsx`
- `budgetsimple-web/src/app/cashflow/page.tsx`
- `budgetsimple-web/src/app/plan/page.tsx`
- `budgetsimple-web/src/app/investing/page.tsx`
- `budgetsimple-web/src/app/connect/page.tsx`
- `budgetsimple-web/src/app/settings/page.tsx`
- `README.md`
