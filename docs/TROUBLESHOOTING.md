# Troubleshooting Guide

## Common Issues

### "Failed to fetch" Errors

**Symptom:** Console shows "Failed to fetch" when loading milestones, subscriptions, or other API data.

**Causes:**
1. Backend server not running
2. Backend server crashed
3. CORS configuration issue
4. Network connectivity issue

**Solutions:**

1. **Check if backend is running:**
   ```bash
   cd budgetsimple-api
   npm run dev
   ```
   The backend should start on `http://localhost:3001`

2. **Check backend logs:**
   Look for errors in the terminal where the backend is running.

3. **Verify API endpoint:**
   ```bash
   curl http://localhost:3001/api/milestones/next?userId=demo-user
   ```
   Should return JSON (even if empty).

4. **Check CORS:**
   Ensure `NEXT_PUBLIC_API_URL` in frontend matches backend URL.

5. **Check environment variables:**
   - Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Frontend: `NEXT_PUBLIC_API_URL`

### Milestones Not Showing

**Symptom:** Milestone widget shows "No milestones yet" even after creating them.

**Causes:**
1. Database not connected
2. Migrations not run
3. RLS policies blocking access
4. User ID mismatch

**Solutions:**

1. **Run database migrations:**
   ```bash
   # In Supabase dashboard, run:
   # budgetsimple-api/migrations/002_create_milestones_tables.sql
   ```

2. **Check Supabase connection:**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Check backend logs for connection errors

3. **Verify RLS policies:**
   - Ensure policies allow `demo-user` access (for development)
   - Or use real auth with proper user IDs

4. **Check user ID:**
   - Ensure frontend and backend use same `userId`
   - Default is `demo-user` for development

### Subscription Detection Not Working

**Symptom:** "No subscription patterns detected" even with subscription data.

**Causes:**
1. No transactions in date range
2. Transactions not marked as expenses
3. Detection algorithm too strict
4. Database query issues

**Solutions:**

1. **Check transaction data:**
   - Verify transactions exist in database
   - Check date range covers transaction dates
   - Ensure transactions have `type='expense'` or `amount < 0`

2. **Check detection logs:**
   - Backend logs show detection process
   - Look for "No transactions found" messages

3. **Test with debug endpoint:**
   ```bash
   curl http://localhost:3001/api/subscriptions/debug?userId=demo-user
   ```

4. **Adjust detection parameters:**
   - Algorithm is lenient by default
   - Check `budgetsimple-api/lib/subscription-detection.js` for thresholds

### Database Connection Issues

**Symptom:** Backend logs show Supabase connection errors.

**Causes:**
1. Missing environment variables
2. Invalid Supabase credentials
3. Network issues
4. Supabase project paused/deleted

**Solutions:**

1. **Check environment variables:**
   ```bash
   # In budgetsimple-api/.env or environment
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Verify Supabase project:**
   - Check project is active in Supabase dashboard
   - Verify URL and keys are correct

3. **Test connection:**
   ```bash
   curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
        https://your-project.supabase.co/rest/v1/
   ```

### Frontend Build Errors

**Symptom:** `npm run build` or `npm run dev` fails.

**Causes:**
1. TypeScript errors
2. Missing dependencies
3. Environment variable issues

**Solutions:**

1. **Install dependencies:**
   ```bash
   cd budgetsimple-web
   npm install
   ```

2. **Check TypeScript errors:**
   ```bash
   npm run type-check
   ```

3. **Check environment variables:**
   - Ensure `.env.local` exists with `NEXT_PUBLIC_API_URL`

### CORS Errors

**Symptom:** Browser console shows CORS policy errors.

**Causes:**
1. Backend CORS not configured
2. Frontend URL not in allowed origins
3. Credentials not handled correctly

**Solutions:**

1. **Check CORS configuration:**
   - See `budgetsimple-api/plugins/cors.js`
   - Ensure frontend URL is in allowed origins

2. **Check fetch calls:**
   - Ensure `mode: 'cors'` and `credentials: 'include'` are set
   - Check `NEXT_PUBLIC_API_URL` matches backend URL

## Development Setup Checklist

- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 3000
- [ ] Supabase environment variables set
- [ ] Database migrations run
- [ ] CORS configured correctly
- [ ] `NEXT_PUBLIC_API_URL` set in frontend

## Getting Help

1. Check backend logs for detailed error messages
2. Check browser console for frontend errors
3. Verify environment variables are set
4. Test API endpoints directly with curl
5. Check Supabase dashboard for database issues

