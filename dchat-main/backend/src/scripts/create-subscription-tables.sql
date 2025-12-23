-- Subscription Management Tables for Dchat

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  wallet_address VARCHAR(42) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'alipay', 'crypto', 'wechat')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  transaction_hash VARCHAR(255), -- For crypto payments
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage statistics table
CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  storage_used BIGINT DEFAULT 0, -- in bytes
  groups_created INTEGER DEFAULT 0,
  contacts_added INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Subscription features table (for custom enterprise features)
CREATE TABLE IF NOT EXISTS subscription_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  feature_value JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscription_id, feature_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet_address ON subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON usage_stats(user_id, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_stats_updated_at BEFORE UPDATE ON usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default free subscriptions for existing users (optional)
-- This can be run separately after initial setup
-- INSERT INTO subscriptions (user_id, wallet_address, plan, status, current_period_start, current_period_end)
-- SELECT id, wallet_address, 'free', 'active', NOW(), NOW() + INTERVAL '100 years'
-- FROM users WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.user_id = users.id);

-- Grant permissions (adjust based on your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_backend_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_backend_user;

COMMENT ON TABLE subscriptions IS 'User subscription plans and billing information';
COMMENT ON TABLE payment_transactions IS 'Payment transaction history';
COMMENT ON TABLE usage_stats IS 'Daily usage statistics per user';
COMMENT ON TABLE subscription_features IS 'Custom features for enterprise subscriptions';
