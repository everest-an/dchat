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


-- ============================================================================
-- Public Key Management Tables (Added for whitepaper-p0-features)
-- ============================================================================

-- 公钥存储表 - 存储用户当前公钥
CREATE TABLE IF NOT EXISTS public_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  public_key TEXT NOT NULL,
  signing_public_key TEXT, -- 签名公钥，用于消息认证
  key_format VARCHAR(10) DEFAULT 'PEM', -- PEM, JWK, or BASE64
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rotated_at TIMESTAMP WITH TIME ZONE
);

-- 公钥历史表 - 用于解密旧消息
CREATE TABLE IF NOT EXISTS public_key_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  public_key TEXT NOT NULL,
  signing_public_key TEXT, -- 签名公钥历史
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_public_keys_address ON public_keys(wallet_address);
CREATE INDEX IF NOT EXISTS idx_public_keys_user ON public_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_public_keys_current ON public_keys(wallet_address, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_public_key_history_address ON public_key_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_public_key_history_valid ON public_key_history(wallet_address, valid_from, valid_until);

-- 启用 RLS
ALTER TABLE public_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_key_history ENABLE ROW LEVEL SECURITY;

-- 公钥表策略 - 公钥是公开的，任何人都可以读取
CREATE POLICY "Anyone can read public keys" ON public_keys
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own public keys" ON public_keys
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own public keys" ON public_keys
  FOR UPDATE USING (true);

-- 公钥历史表策略
CREATE POLICY "Anyone can read public key history" ON public_key_history
  FOR SELECT USING (true);

CREATE POLICY "System can insert public key history" ON public_key_history
  FOR INSERT WITH CHECK (true);

-- 添加签名公钥列（如果表已存在）
-- ALTER TABLE public_keys ADD COLUMN IF NOT EXISTS signing_public_key TEXT;
-- ALTER TABLE public_key_history ADD COLUMN IF NOT EXISTS signing_public_key TEXT;
