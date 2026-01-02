# Subscription Detection Debugging Guide

## Quick Debug Steps

### 1. Check Backend Logs

When you run detection, check the backend console for detailed logs:

```bash
cd budgetsimple-api
npm run dev
```

Look for logs prefixed with `[DETECTION]` and `[NORMALIZE]`:
- `[DETECTION] Starting detection with X raw transactions`
- `[DETECTION] After normalization: X valid transactions`
- `[DETECTION] Grouped into X merchant groups`
- `[DETECTION] Analyzing merchant group: ...`
- `[DETECTION] ✓ Detected subscription: ...` or `[DETECTION] Skipping ...`

### 2. Use Debug Endpoint

Visit: `http://localhost:3001/api/subscriptions/debug?userId=demo-user`

This shows:
- Total transactions for your user
- Sample transactions
- Transactions in date range
- Expense transaction count
- Sample user_ids (to check for mismatches)
- Test query result (actual detection query)

### 3. Common Issues

#### Issue: "No transactions found"
**Check:**
- User ID matches database (`sampleUserIds` in debug output)
- Date range includes your transaction dates
- Backend server is running on port 3001
- Transactions exist in the database

**Solution:**
- Verify userId in frontend matches database
- Expand date range (try 12 or 24 months)
- Check backend logs for "Fetched X expense transactions"

#### Issue: "No subscription patterns detected" but transactions exist
**Check backend logs for:**
- `[DETECTION] After normalization: X valid transactions` - if 0, transactions are being filtered out
- `[DETECTION] Grouped into X merchant groups` - if 0, no valid merchant keys
- `[DETECTION] Skipping ...` - shows why each merchant group was skipped

**Common reasons:**
1. **Merchant key is 'unknown'**
   - Transactions missing merchant/description fields
   - Merchant names are too short or empty
   - Check `[NORMALIZE]` logs for details

2. **No category match**
   - Category field doesn't contain "subscription" keywords
   - Category field is null or empty

3. **No known service match**
   - Merchant name doesn't match known subscription services
   - Check if merchant name is in the known subscriptions list

4. **No recurring pattern**
   - Need at least 2 occurrences (or 1 if category/known match)
   - Transactions not recurring regularly
   - Amounts vary too much

5. **Amounts not consistent**
   - Variance exceeds ±5% OR ±$2 tolerance
   - Check `amountConsistency` in logs

### 4. Enable Detailed Logging

The detection algorithm now logs:
- Each step of normalization
- Why transactions are filtered out
- Merchant grouping results
- Detection method used (category/known_subscription/recurrence)
- Why merchant groups are skipped

### 5. Test with Sample Data

If you want to test the detection algorithm directly:

```javascript
const { detectSubscriptions } = require('./lib/subscription-detection');

const testTransactions = [
  {
    id: '1',
    date: '2024-01-15',
    merchant: 'Netflix',
    amount: -15.99,
    category: 'subscription'
  },
  {
    id: '2',
    date: '2024-02-15',
    merchant: 'Netflix',
    amount: -15.99,
    category: 'subscription'
  }
];

const candidates = detectSubscriptions(testTransactions);
console.log('Candidates:', candidates);
```

### 6. Check Transaction Schema

Ensure your transactions have:
- `date` field (ISO date format)
- `merchant` or `merchant_name` field (for merchant matching)
- `description` field (fallback for merchant)
- `amount` field (negative for expenses, or use `type='expense'`)
- `category` or `category_id` or `category_name` (optional, but helps)

### 7. Verify Detection Logic

The algorithm detects subscriptions in this priority:
1. **Category match** (highest priority)
   - If category contains "subscription", "recurring", etc.
   - Works even with single occurrence
   - Confidence: 0.85+

2. **Known service match**
   - If merchant matches known subscriptions (Netflix, Spotify, etc.)
   - Works even with single occurrence
   - Confidence: 0.85+

3. **Recurring pattern**
   - Requires 2+ occurrences
   - Must have consistent amounts (±5% or ±$2)
   - Must have regular intervals (monthly, weekly, etc.)
   - Confidence: 0.5-0.9

## Next Steps

1. **Run detection** and check backend console logs
2. **Look for `[DETECTION]` logs** to see the full flow
3. **Check why transactions are filtered** - look for `[NORMALIZE]` logs
4. **Verify merchant keys** - ensure they're not all 'unknown'
5. **Check category fields** - ensure they contain subscription keywords if you expect category-based detection

