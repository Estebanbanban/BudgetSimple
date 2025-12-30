-- Subscription Detection Tables
-- Creates tables for storing subscription candidates and their relationships to transactions

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  estimated_monthly_amount DECIMAL(12, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'bi-weekly', 'quarterly', 'annual')),
  first_detected_date DATE NOT NULL,
  confirmed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  pattern_type TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  average_amount DECIMAL(12, 2),
  variance_percentage DECIMAL(5, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription-transaction mapping (many-to-many)
CREATE TABLE IF NOT EXISTS subscription_transactions (
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  PRIMARY KEY (subscription_id, transaction_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_merchant ON subscriptions(merchant);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_subscription_id ON subscription_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_transaction_id ON subscription_transactions(transaction_id);

-- Row Level Security (RLS) policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions"
  ON subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only see subscription_transactions for their subscriptions
CREATE POLICY "Users can view their own subscription transactions"
  ON subscription_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_transactions.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only insert subscription_transactions for their subscriptions
CREATE POLICY "Users can insert their own subscription transactions"
  ON subscription_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_transactions.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only delete subscription_transactions for their subscriptions
CREATE POLICY "Users can delete their own subscription transactions"
  ON subscription_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_transactions.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

