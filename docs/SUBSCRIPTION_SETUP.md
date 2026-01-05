# Subscription Feature Setup Guide

## Quick Start

### 1. Local-first (default)

By default, **Subscriptions works locally** (no backend required):

- Import transactions in `Connect / Import`
- Go to `/subscriptions`
- Click **Detect from local data**
- Confirm/reject (stored locally in IndexedDB)
- View `/subscriptions/summary` (local summary + drilldowns)

### 2. (Optional) Start the Backend API Server

**In a terminal window, run:**
```bash
cd budgetsimple-api
npm run dev
```

You should see:
```
Server listening at http://127.0.0.1:3001
```

**Keep this terminal open** - the server must stay running.

### 3. Verify Backend is Running (optional)

Test the API:
```bash
curl http://localhost:3001/health
# Should return: {"ok":true}
```

### 4. Access Subscription Features

**In your browser:**
- Navigate to: `http://localhost:3000/subscriptions`
- Or click "Subscriptions" in the sidebar navigation

## Troubleshooting "Failed to fetch" Errors

### Problem: "Failed to fetch" in browser console

**Solution:** If you enabled backend subscriptions, the backend API server is not running or not accessible.

1. **Check if backend is running:**
   ```bash
   lsof -ti:3001
   # Should return a process ID
   ```

2. **If not running, start it:**
   ```bash
   cd budgetsimple-api
   npm run dev
   ```

3. **Verify it's working:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"ok":true}
   ```

4. **Check browser console** for the actual error message

### Common Issues

1. **Port already in use:**
   ```bash
   # Kill existing process
   lsof -ti:3001 | xargs kill -9
   # Then restart
   cd budgetsimple-api && npm run dev
   ```

2. **CORS errors:**
   - Backend CORS is configured to allow `http://localhost:3000`
   - Make sure frontend is running on port 3000
   - Check browser console for specific CORS error messages

3. **API endpoint not found:**
   - Verify routes are loaded: check `/tmp/api-server.log` for errors
   - Make sure `routes/subscriptions.js` exists and is valid

## Testing Subscription Detection

1. **Make sure you have transaction data** (or the system will return empty results)

2. **Go to Subscriptions page:** `http://localhost:3000/subscriptions`

3. **Click "Detect Subscriptions"**

4. **Select analysis period** (3, 6, 12, or 24 months)

5. **Review detected candidates** and confirm/reject them

## API Endpoints

All endpoints are prefixed with `/api/subscriptions`:

- `POST /api/subscriptions/detect` - Detect subscription candidates
- `GET /api/subscriptions/candidates?status=pending` - Get candidates
- `GET /api/subscriptions/candidates/:id` - Get candidate details
- `PATCH /api/subscriptions/:id/confirm` - Confirm subscription
- `PATCH /api/subscriptions/:id/reject` - Reject subscription
- `PATCH /api/subscriptions/:id` - Update subscription
- `POST /api/subscriptions` - Create subscription manually
- `GET /api/subscriptions/summary` - Get subscription summary
- `GET /api/subscriptions/:id/transactions` - Get subscription transactions

## Environment Variables

For full functionality (with Supabase), add to `budgetsimple-api/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Without these, the system runs in "stub mode" and returns empty results.

