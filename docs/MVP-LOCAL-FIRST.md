# MVP: Local-First Architecture

## Core Principle

**The MVP is local-first. All analytics, insights, and subscription detection work from IndexedDB (local storage). The backend is optional and only used when explicitly enabled.**

## Source of Truth

- **Primary:** IndexedDB (browser local storage)
- **Secondary:** Backend/Supabase (optional, feature-flagged)

## Why Local-First?

1. **Immediate Value:** Users see insights right after CSV import, no backend setup required
2. **Privacy:** Data stays on device by default
3. **Offline:** Works without internet connection
4. **Simplicity:** No database migrations, no auth setup for MVP
5. **Speed:** No network latency for analytics

## Data Flow

### CSV Import → IndexedDB → Analytics

1. User uploads CSV
2. Transactions stored in IndexedDB
3. All analytics computed from IndexedDB:
   - Subscription detection (`analyzeMerchants()`)
   - Monthly summaries
   - "What Changed" analysis
   - Budget pace
   - Insights

### Backend (Optional)

Backend is only used when:
- `NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=true` is set
- User explicitly enables cloud sync (future feature)

## Features That Work Locally

✅ **Subscription Detection**
- Uses `analyzeMerchants()` from `runtime.ts`
- Detects recurring patterns from IndexedDB transactions
- No API calls required

✅ **Monthly Summaries**
- Computed from local transactions
- Income, expenses, savings rate

✅ **"What Changed" Analysis**
- Month-over-month comparison from local data
- Category deltas, spending changes

✅ **Budget Tracking**
- Budgets stored in localStorage
- Spending computed from IndexedDB
- Pace calculations local

✅ **Insights Engine**
- Deterministic rules-based insights
- All calculations from IndexedDB
- Reproducible outputs

## Backend Routes (Optional)

These routes exist but are **disabled by default**:

- `/api/subscriptions/*` - Only used if `NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=true`
- `/api/milestones/*` - Works with graceful degradation (returns empty if no DB)

## Feature Flags

```bash
# Disable backend subscriptions (default)
NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=false

# Enable backend subscriptions (optional)
NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=true
```

## Migration Path (Future)

When ready to add cloud sync:

1. Implement transaction sync to Supabase
2. Add `POST /api/transactions/bulk` endpoint
3. Update CSV import to also sync to backend
4. Enable backend subscriptions feature flag
5. Backend detection becomes meaningful

## For Developers

### Adding New Features

1. **Always compute from IndexedDB first**
2. **Use backend as optional enhancement**
3. **Feature flag backend-dependent features**
4. **Test with backend disabled**

### Testing

```bash
# Test local-first (no backend)
# Just start frontend, import CSV, verify insights work

# Test with backend (optional)
cd budgetsimple-api && npm run dev
# Set NEXT_PUBLIC_USE_BACKEND_SUBSCRIPTIONS=true
```

## Acceptance Criteria

✅ Dashboard subscriptions KPI works immediately after CSV import with no backend running
✅ All insights computed from local data
✅ No "Failed to fetch" errors when backend is off
✅ Backup/restore works for IndexedDB data
✅ Same dataset always produces same insights

