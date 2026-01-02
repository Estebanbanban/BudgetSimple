-- Milestones tables for MVP
-- Supports Epic 5: Milestones & Progress Tracking

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  label TEXT NOT NULL,
  target_value NUMERIC(15,2) NOT NULL CHECK (target_value > 0),
  target_date DATE,
  type TEXT NOT NULL CHECK (type IN ('net_worth', 'invested_assets', 'savings')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_order ON milestones(user_id, display_order);

-- Enable RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own milestones"
  ON milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones"
  ON milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones"
  ON milestones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own milestones"
  ON milestones FOR DELETE
  USING (auth.uid() = user_id);

-- Net worth snapshots (for tracking progress)
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  snapshot_date DATE NOT NULL,
  net_worth NUMERIC(15,2) NOT NULL,
  invested_assets NUMERIC(15,2) DEFAULT 0,
  cash NUMERIC(15,2) DEFAULT 0,
  debt NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON net_worth_snapshots(user_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own snapshots"
  ON net_worth_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON net_worth_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON net_worth_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

-- User assumptions for projections
CREATE TABLE IF NOT EXISTS user_assumptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  expected_annual_return NUMERIC(5,2) DEFAULT 7.0 CHECK (expected_annual_return >= 0 AND expected_annual_return <= 100),
  monthly_contribution_override NUMERIC(15,2), -- NULL = use calculated from savings
  projection_horizon_months INTEGER DEFAULT 360 CHECK (projection_horizon_months > 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_assumptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own assumptions"
  ON user_assumptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assumptions"
  ON user_assumptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assumptions"
  ON user_assumptions FOR UPDATE
  USING (auth.uid() = user_id);

