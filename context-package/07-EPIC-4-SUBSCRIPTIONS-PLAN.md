# Epic 4 Plan - Subscription Detection + Review Workflow

This doc scopes Epic 4 and provides a working outline for stories and acceptance criteria. We will refine each story together before implementation.

## Goal
Enable users to identify, review, and manage recurring subscriptions automatically, providing clear visibility into subscription spend and supporting subscription management decisions.

## Scope
- Automatic detection of recurring subscription patterns from transaction data
- Review and confirmation UI for detected subscription candidates
- Subscription summaries showing total monthly subscription spend
- Integration with existing transaction categorization and drilldown flows
- Support for subscription tagging and categorization

## Non-Goals (for this epic)
- Subscription cancellation workflows (future enhancement)
- Subscription price change tracking (future enhancement)
- Subscription renewal reminders (future enhancement)
- Integration with external subscription management services (future enhancement)

## Story List (from epics.md)

### 4.1 Subscription Detection (Recurring Pattern Candidates)
**User Story**
As a user, I want the app to detect likely subscriptions so that I can identify recurring spend quickly.

**Acceptance Criteria (baseline)**
- System analyzes transactions for recurring patterns (monthly cadence + consistent merchant)
- Produces a list of subscription candidates with estimated monthly cost
- Candidates are explainable via contributing transactions
- Detection works with at least several weeks of transaction history

**Open Questions**
- Minimum number of occurrences to qualify as a subscription (e.g., 2-3 months)
- Tolerance for amount variations (e.g., ±5% or exact match only)
- Handling of bi-weekly, quarterly, or annual subscriptions
- Confidence scoring for detection accuracy
- How to handle subscriptions that change merchants (e.g., rebranding)

### 4.2 Subscription Review and Confirmation UI
**User Story**
As a user, I want to confirm or reject detected subscriptions so that the subscription list reflects reality.

**Acceptance Criteria (baseline)**
- Review interface shows subscription candidates with supporting evidence
- Users can confirm, reject, or adjust merchant/category mapping
- Confirmed subscriptions appear in summaries and dashboard drilldowns
- Rejected candidates are excluded from future detection (or marked as reviewed)

**Open Questions**
- UI pattern: dedicated page vs. modal vs. side panel
- Batch review vs. individual review workflow
- How to handle partial matches (e.g., subscription with occasional extra charges)
- Should users be able to manually add subscriptions not detected?
- Should users be able to edit subscription details (amount, frequency, category)?

### 4.3 Subscription Summaries ("Subscriptions per Month")
**User Story**
As a user, I want a subscriptions summary so that I know my recurring spend and can reduce it if needed.

**Acceptance Criteria (baseline)**
- Show total subscriptions per month
- Breakdown by merchant/category
- Each summary links to contributing transactions
- Summary integrates with dashboard and cashflow map views

**Open Questions**
- Should summaries show historical trends (month-over-month changes)?
- Should summaries include projected annual spend?
- How to handle subscriptions with variable amounts?
- Should summaries support filtering by category or date range?
- Integration with action items panel (Epic 3) for subscription insights?

## Technical Considerations

### Data Model
- Subscription entity: id, user_id, merchant, category_id, estimated_monthly_amount, frequency, first_detected_date, confirmed_date, status (pending/confirmed/rejected)
- Subscription transaction mapping: subscription_id, transaction_id (many-to-many)
- Detection metadata: confidence_score, pattern_type, contributing_transaction_ids

### Detection Algorithm
- Pattern matching: group transactions by merchant, analyze date intervals
- Frequency detection: monthly, bi-weekly, quarterly, annual
- Amount consistency: calculate average and variance
- Minimum occurrences: require at least 2-3 occurrences for confidence

### Integration Points
- Transaction data model (Epic 2)
- Category system (Epic 2)
- Dashboard drilldowns (Epic 3)
- Cashflow map (Epic 5) - subscriptions as a node/flow

## Testing Plan (draft)
- Unit: Subscription detection algorithm with various transaction patterns
- Integration: Subscription review workflow and confirmation persistence
- E2E: End-to-end flow from detection → review → summary display
- Edge cases: Variable amounts, missed payments, merchant changes, one-time charges that look like subscriptions

## Decisions Needed (from you)
1. Detection sensitivity: How many occurrences required? (Suggested: 2-3)
2. Review UI pattern: Dedicated page vs. modal? (Suggested: Dedicated page with list view)
3. Manual subscription entry: Should users be able to add subscriptions manually? (Suggested: Yes)
4. Summary location: Dedicated subscriptions page vs. dashboard widget? (Suggested: Both)
5. Amount tolerance: Exact match vs. ±5% variance? (Suggested: ±5% for flexibility)

## Decision Log
- 2025-01-xx: [Decisions will be logged here as they are made]

