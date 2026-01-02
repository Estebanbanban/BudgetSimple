# Start Here: Budgetsimple MVP

## Quick Overview

Budgetsimple MVP is a **local-first** personal finance tracker. All analytics, insights, and subscription detection work from IndexedDB (browser storage). The backend is optional.

## Architecture

- **Frontend:** Next.js (React) - `budgetsimple-web/`
- **Backend:** Fastify API - `budgetsimple-api/` (optional)
- **Storage:** IndexedDB (primary), Supabase (optional)
- **Source of Truth:** IndexedDB

## Key Principle

**MVP is local-first. All analytics work from IndexedDB. Backend is optional and feature-flagged.**

See [MVP-LOCAL-FIRST.md](./MVP-LOCAL-FIRST.md) for details.

## Golden Path (MVP Demo)

1. Import CSV → Transactions in IndexedDB
2. See monthly overview → Computed from IndexedDB
3. See "What Changed" → Month-over-month from IndexedDB
4. See subscriptions → Detected from IndexedDB transactions
5. See milestones → Progress tracking
6. Get insights → Rules-based from IndexedDB

## Development Setup

### Frontend Only (Local-First MVP)

```bash
cd budgetsimple-web
npm install
npm run dev
# Open http://localhost:3000
# Import CSV → See insights immediately
```

### With Backend (Optional)

```bash
# Terminal 1: Backend
cd budgetsimple-api
npm install
npm run dev

# Terminal 2: Frontend
cd budgetsimple-web
npm run dev
```

## Feature Flags

```bash
# .env.local in budgetsimple-web/
NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=false  # Default: local-first
NEXT_PUBLIC_API_URL=http://localhost:3001    # Only if using backend
```

## Important Files

- `budgetsimple-web/src/lib/runtime.ts` - Core analytics (local-first)
- `budgetsimple-web/src/lib/insightsEngine.ts` - Deterministic insights
- `budgetsimple-web/src/lib/backup.ts` - Backup/restore
- `budgetsimple-api/routes/subscriptions.js` - Backend (optional)

## Common Issues

### "Failed to fetch" errors

**Solution:** Backend is optional. Set `NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=false` (default) and use local detection.

### Subscriptions not showing

**Solution:** Ensure transactions are in IndexedDB. Check browser DevTools → Application → IndexedDB → budgetsimple.

### Insights not updating

**Solution:** Insights are computed on-demand from IndexedDB. Refresh page or trigger re-render.

## Next Steps

1. Read [MVP-LOCAL-FIRST.md](./MVP-LOCAL-FIRST.md)
2. Read [MVP-SCOPE.md](./MVP-SCOPE.md)
3. Read [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md)

## For AI Assistants

**Critical:** This MVP is local-first. Do not assume backend is required. All features should work from IndexedDB. Backend is optional and feature-flagged.

When adding features:
1. Compute from IndexedDB first
2. Use backend as optional enhancement
3. Feature flag backend-dependent code
4. Test with backend disabled

