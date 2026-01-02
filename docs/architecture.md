# Budgetsimple - Backend Architecture

## Overview

Budgetsimple uses a **Fastify-based Node.js API** with **Supabase (PostgreSQL)** as the database infrastructure. The architecture follows a plugin-based, modular design with clear separation of concerns.

## Technology Stack

### Backend Framework

- **Fastify** (v4.x) - High-performance Node.js web framework
- **Node.js** - Runtime environment

### Database Infrastructure

- **Supabase** - PostgreSQL database with:
  - Row Level Security (RLS) for multi-tenant data isolation
  - RESTful API via PostgREST
  - Real-time subscriptions (available but not currently used)
  - Authentication (via Supabase Auth, referenced but not fully integrated)

### Key Libraries

- `@supabase/supabase-js` - Supabase client library
- `@fastify/cors` - CORS handling
- `@fastify/swagger` - OpenAPI/Swagger documentation
- `@fastify/autoload` - Auto-loading plugins and routes

## Project Structure

```
budgetsimple-api/
├── app.js                 # Main Fastify application entry point
├── package.json           # Dependencies and scripts
├── openapi.json          # OpenAPI specification (auto-generated)
│
├── plugins/              # Fastify plugins (auto-loaded)
│   ├── supabase.js       # Supabase client initialization
│   ├── cors.js           # CORS configuration
│   ├── swagger.js        # API documentation
│   ├── sensible.js      # Sensible defaults
│   └── support.js        # Test support utilities
│
├── routes/               # API route handlers (auto-loaded)
│   ├── health.js         # Health check endpoint
│   ├── root.js           # Root endpoint
│   ├── cashflow.js       # Cashflow computation endpoints
│   ├── subscriptions.js  # Subscription detection & management
│   └── example/          # Example routes
│
├── lib/                  # Business logic libraries
│   ├── cashflow-classifier.js    # Transaction classification
│   ├── subscription-detection.js # Subscription pattern detection
│   ├── known-subscriptions.js    # Known subscription database
│   └── db-subscriptions.js       # Database service layer
│
├── migrations/           # Database migrations (SQL)
│   └── 001_create_subscriptions_tables.sql
│
└── test/                 # Test files
    └── routes/           # Route tests
```

## Architecture Patterns

### 1. Plugin-Based Architecture

Fastify uses a plugin system where functionality is organized into plugins:

```javascript
// app.js - Auto-loads all plugins and routes
fastify.register(AutoLoad, {
  dir: path.join(__dirname, "plugins"),
  options: Object.assign({}, opts),
});

fastify.register(AutoLoad, {
  dir: path.join(__dirname, "routes"),
  options: Object.assign({}, opts),
});
```

**Benefits:**

- Modular and testable
- Easy to add new features
- Clear separation of concerns

### 2. Database Service Layer Pattern

Database operations are abstracted into service layers:

```javascript
// lib/db-subscriptions.js
async function getSubscriptionCandidates(fastify, userId, status) {
  // Database logic isolated here
  const { data, error } = await fastify.supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", status);

  return data || [];
}
```

**Benefits:**

- Routes stay clean and focused
- Database logic is reusable
- Easy to mock for testing

### 3. Row Level Security (RLS)

Supabase enforces data isolation at the database level:

```sql
-- Example RLS policy
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Benefits:**

- Security at the database level
- Prevents data leaks even if API logic has bugs
- Multi-tenant by default

## Data Flow

### Request Flow

```
1. Client Request
   ↓
2. Fastify Route Handler (routes/*.js)
   ↓
3. Business Logic (lib/*.js)
   ↓
4. Database Service Layer (lib/db-*.js)
   ↓
5. Supabase Client (fastify.supabase)
   ↓
6. PostgreSQL Database (via Supabase)
   ↓
7. Response back through layers
```

### Example: Subscription Detection

```
POST /api/subscriptions/detect
  ↓
routes/subscriptions.js (detectHandler)
  ↓
lib/db-subscriptions.js (getTransactionsForRange)
  ↓
fastify.supabase.from('transactions').select(...)
  ↓
lib/subscription-detection.js (detectSubscriptions)
  ↓
lib/db-subscriptions.js (storeSubscriptionCandidates)
  ↓
Response with candidates
```

## Database Schema

### Current Tables

#### `transactions`

- Stores user transactions (expenses, income)
- Fields: `id`, `user_id`, `date`, `merchant`, `description`, `amount`, `currency`, `type`, `category_id`
- **Note**: This table is referenced but migration may not exist yet (see TODO below)

#### `subscriptions`

- Stores detected/confirmed subscriptions
- Fields: `id`, `user_id`, `merchant`, `category_id`, `estimated_monthly_amount`, `frequency`, `status`, `confidence_score`, etc.
- Created via: `migrations/001_create_subscriptions_tables.sql`

#### `subscription_transactions`

- Many-to-many mapping between subscriptions and transactions
- Links detected subscriptions to their contributing transactions

### Database Access Pattern

```javascript
// All database access goes through Supabase client
const { data, error } = await fastify.supabase
  .from("table_name")
  .select("columns")
  .eq("user_id", userId) // Always filter by user_id for RLS
  .order("date", { ascending: false });
```

## CSV Import & Transaction Storage

### Current State

**CSV Import**:

- Frontend UI exists (`index.html` shows CSV import interface)
- **Backend handling is NOT yet implemented**
- The `routes/cashflow.js` has stub functions:
  ```javascript
  async function getTransactionsForRange(fastify, userId, startDate, endDate) {
    // Stub: return empty array for now
    fastify.log.warn(
      "Using stub transaction data - replace with database query"
    );
    return [];
  }
  ```

### Where CSV Data Should Be Stored

**Recommended Approach:**

1. **Frontend**: Parse CSV client-side (already implemented in UI)
2. **Backend**: Receive parsed transaction data via API
3. **Database**: Store in `transactions` table via Supabase

**Proposed Flow:**

```
1. User uploads CSV → Frontend parses
2. Frontend sends POST /api/transactions/bulk
3. Backend validates and stores in Supabase transactions table
4. Transactions are immediately available for analysis
```

### Transaction Storage Schema (Proposed)

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  merchant TEXT,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  type TEXT CHECK (type IN ('expense', 'income', 'transfer')),
  category_id UUID REFERENCES categories(id),
  category_name TEXT,
  account_id UUID REFERENCES accounts(id),
  imported_from TEXT, -- 'csv', 'manual', 'connector', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, merchant, amount) -- Prevent duplicates
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
```

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# OR
SUPABASE_ANON_KEY=your-anon-key  # For client-side access

# Server Configuration
PORT=3001  # Optional, defaults to 3001
NODE_ENV=development  # or production
```

### Configuration Location

- **Development**: `.env` file (gitignored)
- **Production**: Environment variables or secrets manager

## API Structure

### Endpoints

**Health & Docs:**

- `GET /health` - Health check
- `GET /docs` - Swagger UI
- `GET /openapi.json` - OpenAPI spec

**Cashflow:**

- `POST /api/cashflow/compute` - Compute cashflow graph
- `GET /api/cashflow/drilldown` - Get transactions for a node

**Subscriptions:**

- `POST /api/subscriptions/detect` - Detect subscription patterns
- `GET /api/subscriptions/candidates` - List subscription candidates
- `GET /api/subscriptions/candidates/:id` - Get candidate details
- `PATCH /api/subscriptions/:id/confirm` - Confirm subscription
- `PATCH /api/subscriptions/:id/reject` - Reject subscription
- `GET /api/subscriptions/summary` - Get subscription summary

### API Response Format

All endpoints return JSON:

```json
{
  "data": { ... },
  "metadata": { ... },
  "error": "Error message if failed"
}
```

## Security

### Authentication (Current State)

- **Not fully implemented** - Currently uses `userId = 'demo-user'` as placeholder
- **Future**: Integrate Supabase Auth for real authentication
- **RLS Policies**: Already in place, will work once auth is integrated

### Data Isolation

- **Row Level Security (RLS)**: Enforced at database level
- **User ID Filtering**: All queries filter by `user_id`
- **Service Role Key**: Backend uses service role for bypassing RLS (when needed)

## Development Workflow

### Running Locally

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Supabase credentials

# Run in development mode
npm run dev

# Run tests
npm test
```

### Database Migrations

Migrations are SQL files in `migrations/`:

- Run manually via Supabase SQL editor
- Or use a migration tool (not currently set up)

**Current Migration:**

- `001_create_subscriptions_tables.sql` - Creates subscriptions tables with RLS

## Current Limitations & TODOs

### Missing Infrastructure

1. **Transaction Storage**

   - ❌ `transactions` table migration doesn't exist
   - ❌ CSV import backend endpoint not implemented
   - ❌ Transaction CRUD operations missing

2. **Authentication**

   - ❌ Supabase Auth not integrated
   - ⚠️ Currently using `demo-user` placeholder
   - ✅ RLS policies ready for when auth is added

3. **Net Worth Tracking**

   - ❌ `net_worth_snapshots` table doesn't exist (needed for Epic 5)
   - ❌ Net worth calculation not implemented

4. **Categories**
   - ❌ `categories` table doesn't exist
   - ⚠️ Referenced but not created

### What Works

✅ Subscription detection algorithm  
✅ Subscription storage and retrieval  
✅ Cashflow computation (with stub data)  
✅ API documentation (Swagger)  
✅ Health checks  
✅ CORS configuration  
✅ Database service layer pattern

## Future Architecture Considerations

### For Epic 5 (Milestones & Projection)

**New Tables Needed:**

- `milestones` - User-defined financial milestones
- `net_worth_snapshots` - Historical net worth tracking
- `user_assumptions` - Projection settings (return rate, etc.)

**New Services:**

- `lib/projection-engine.js` - Net worth projection calculations
- `lib/milestone-evaluator.js` - Milestone status evaluation
- `lib/db-milestones.js` - Milestone database operations

### Scalability

**Current**: Single Fastify instance, single Supabase project  
**Future Considerations**:

- Connection pooling (Supabase handles this)
- Caching layer (Redis) for frequently accessed data
- Background jobs (subscription detection, net worth snapshots)
- File storage (Supabase Storage) for CSV backups

## Summary

**Backend Stack:**

- Fastify (Node.js) API server
- Supabase (PostgreSQL) database
- Plugin-based modular architecture
- Service layer pattern for database operations
- Row Level Security for multi-tenant isolation

**Current State:**

- ✅ Core infrastructure in place
- ✅ Subscription features working
- ❌ Transaction storage not implemented
- ❌ CSV import backend missing
- ⚠️ Authentication placeholder only

**Next Steps:**

1. Create `transactions` table migration
2. Implement CSV import endpoint
3. Implement transaction CRUD operations
4. Integrate Supabase Auth
5. Create net worth tracking tables (for Epic 5)
