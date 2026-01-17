-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  alipay_id TEXT UNIQUE,
  login_method TEXT NOT NULL CHECK (login_method IN ('wallet', 'email', 'phone', 'alipay', 'password')),
  password_hash TEXT,
  encrypted_wallet TEXT,
  display_name TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_identifier ON verification_codes(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

-- Create policies for verification_codes table
CREATE POLICY "Anyone can insert verification codes" ON verification_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read verification codes" ON verification_codes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update verification codes" ON verification_codes
  FOR UPDATE USING (true);


-- ============================================================================
-- Business Profile Tables (Added for profile-business-kyc feature)
-- ============================================================================

-- Create user_business_info table
CREATE TABLE IF NOT EXISTS user_business_info (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  industry VARCHAR(100),
  bio TEXT,
  company_logo_url VARCHAR(500),
  website VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_verifications table for Privado ID KYC/KYB
CREATE TABLE IF NOT EXISTS user_verifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'kyc_humanity', 'kyc_age', 'kyc_country', 'kyb_registration', 'kyb_tax_id', 'kyb_license'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'expired', 'revoked'
  issuer_did VARCHAR(255),
  credential_id VARCHAR(255),
  proof_hash VARCHAR(255),
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create linkedin_connections table
CREATE TABLE IF NOT EXISTS linkedin_connections (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  linkedin_id VARCHAR(100) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  profile_data JSONB,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_business_info_user_id ON user_business_info(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_type ON user_verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_connections_user_id ON linkedin_connections(user_id);

-- Enable RLS on new tables
ALTER TABLE user_business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user_business_info
CREATE POLICY "Users can read their own business info" ON user_business_info
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own business info" ON user_business_info
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own business info" ON user_business_info
  FOR UPDATE USING (true);

-- Create policies for user_verifications
CREATE POLICY "Users can read their own verifications" ON user_verifications
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own verifications" ON user_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own verifications" ON user_verifications
  FOR DELETE USING (true);

-- Create policies for linkedin_connections
CREATE POLICY "Users can read their own linkedin connections" ON linkedin_connections
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own linkedin connections" ON linkedin_connections
  FOR ALL USING (true);
