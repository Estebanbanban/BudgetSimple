# Epic 5: Milestones & Projection Timeline

## Status
Draft

## Overview

**Epic Goal**: Give users long-term clarity and motivation by showing where they are, where they're going, and whether they're ahead or behind. This is the signature FIRE (Financial Independence, Retire Early) feature.

## Business Value

- **User Motivation**: Visual progress toward financial goals increases engagement and retention
- **Differentiation**: This feature sets the app apart as a serious long-term financial planning tool
- **Emotional Anchor**: Becomes the primary reason users return monthly to check progress

## User Story

**As a** long-term planner,  
**I want** to define wealth milestones and see whether my current behavior will realistically get me there,  
**so that** I can adjust my savings rate and stay on track to financial independence.

## Scope (MVP)

### IN Scope
- ✅ User-defined milestones (label, target value, optional target date, type)
- ✅ Net worth projection curve based on current savings rate
- ✅ Progress % + ETA per milestone
- ✅ Dashboard widget for "next milestone"
- ✅ Timeline visualization (simple line chart + milestone markers)
- ✅ Status indicators (ahead/on track/behind)

### OUT Scope (Future)
- Multi-asset modeling (stocks, bonds, real estate separately)
- Scenario stress tests (what-if analysis)
- Benchmark comparison (vs. average, vs. FIRE community)
- Advanced projection models (variable returns, inflation adjustments)
- Milestone sharing/social features

## Functional Requirements

### 5.1 Milestone Model
Each milestone has:
- `id` (UUID)
- `user_id` (for RLS)
- `label` (e.g., "€100k Net Worth", "Financial Independence")
- `target_value` (number, in display currency)
- `target_date` (optional, ISO date)
- `type` (enum: `net_worth` | `invested_assets`)
- `created_at`, `updated_at`
- `order` (for display sorting)

### 5.2 Projection Engine (MVP)
**Inputs:**
- Current net worth `NW0` (from latest snapshot)
- Monthly contribution `C` (derived from savings rate OR manual override)
- Expected annual return `R` (user-configurable, default: 7%)

**Calculation:**
```
Monthly return rate: r = (1 + R)^(1/12) - 1
Projection: NW(t+1) = NW(t) * (1+r) + C
```

**Compute until:**
- Max horizon: 30 years (360 months)
- OR all milestones are hit

**Output:**
- Array of `{ date, netWorth }` points for timeline

### 5.3 Milestone Evaluation
For each milestone:
- **% Complete**: `NW_now / target_value`
- **ETA**: First `t` where `NW(t) >= target_value`
- **Status**:
  - `ahead`: ETA < target_date (if target_date exists)
  - `on_track`: ETA ≈ target_date (±3 months)
  - `behind`: ETA > target_date OR no target_date but projection shows it's far off
- **Required Contribution** (if target_date exists):
  - Calculate required monthly contribution to hit date
  - Show gap vs. current contribution

### 5.4 Timeline View
**Visualization:**
- Horizontal timeline (x-axis: date, y-axis: net worth)
- Current position marker
- Projection curve (line chart)
- Milestone markers (vertical lines + labels)
- Interactive tooltips showing milestone details

**MVP acceptable as:**
- Simple line chart (Chart.js or similar)
- Milestone markers as vertical lines
- Responsive design

### 5.5 Dashboard Widget
**Shows:**
- Next milestone (closest by target_date or target_value)
- % complete
- ETA
- Status indicator (ahead/on track/behind)
- Brief message: "If you continue like this, you'll reach [milestone] in [ETA]"

## Data Requirements

### Database Tables

**milestones**
```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  label TEXT NOT NULL,
  target_value NUMERIC(15,2) NOT NULL,
  target_date DATE,
  type TEXT NOT NULL CHECK (type IN ('net_worth', 'invested_assets')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_user_id ON milestones(user_id);
```

**net_worth_snapshots** (if not exists)
```sql
CREATE TABLE net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  snapshot_date DATE NOT NULL,
  net_worth NUMERIC(15,2) NOT NULL,
  invested_assets NUMERIC(15,2),
  cash NUMERIC(15,2),
  debt NUMERIC(15,2),
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_snapshots_user_date ON net_worth_snapshots(user_id, snapshot_date DESC);
```

**user_assumptions** (for projection settings)
```sql
CREATE TABLE user_assumptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  expected_annual_return NUMERIC(5,2) DEFAULT 7.0,
  monthly_contribution_override NUMERIC(15,2), -- NULL = use calculated from savings
  projection_horizon_months INTEGER DEFAULT 360,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

**Milestones:**
- `GET /api/milestones` - List all milestones for user
- `POST /api/milestones` - Create milestone
- `GET /api/milestones/:id` - Get milestone details
- `PATCH /api/milestones/:id` - Update milestone
- `DELETE /api/milestones/:id` - Delete milestone
- `PATCH /api/milestones/reorder` - Update display order

**Projection:**
- `GET /api/milestones/projection` - Get projection curve + milestone statuses
- `POST /api/milestones/projection/calculate` - Calculate projection with custom inputs

**Dashboard:**
- `GET /api/milestones/next` - Get next milestone for widget

## UI/UX Principles

1. **Optimistic but honest**: Show realistic projections, not fantasy numbers
2. **No clutter**: Focus on the timeline and milestones, minimal UI chrome
3. **Numbers > decoration**: Clear, readable numbers and percentages
4. **Empty state**: "Add your first milestone to see your trajectory"
5. **Progressive disclosure**: Basic view first, details on hover/click

## Success Criteria

- ✅ Users create ≥1 milestone within first week
- ✅ Users revisit this page monthly (track page views)
- ✅ Becomes the emotional "anchor" of the app (highest engagement page)
- ✅ Projection accuracy: Within ±5% of actual after 6 months (if user maintains behavior)

## Stories

1. **5.1: Milestone Management (CRUD)** - Create, read, update, delete milestones
2. **5.2: Projection Engine** - Calculate net worth projection curve
3. **5.3: Milestone Status & ETA** - Calculate progress, ETA, and status for each milestone
4. **5.4: Timeline Visualization** - Render timeline chart with projection and milestones
5. **5.5: Dashboard Widget** - Show next milestone on dashboard

## Dependencies

- **Net Worth Calculation**: Need current net worth (from Epic 3 or new calculation)
- **Savings Rate**: Need monthly contribution estimate (from cashflow analysis)
- **User Settings**: Need user assumptions (return rate, contribution override)

## Technical Notes

- Use Chart.js or Recharts for timeline visualization
- Projection calculations should be server-side for accuracy
- Cache projection results (recalculate on milestone change or monthly)
- Consider WebSocket for real-time updates if net worth changes

## Future Enhancements

- Multi-scenario modeling (optimistic, realistic, pessimistic)
- Asset allocation breakdown in projection
- Inflation adjustments
- Tax considerations
- Milestone templates (e.g., "FIRE at 40", "€1M by 50")
- Social sharing of milestones
- Milestone achievements/badges


