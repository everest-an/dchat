-- ============================================
-- Dchat Supabase 数据库完整初始化脚本
-- ============================================

-- 步骤 1: 删除旧表(如果存在)
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 步骤 2: 创建 users 表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  alipay_id TEXT UNIQUE,
  login_method TEXT NOT NULL CHECK (login_method IN ('wallet', 'email', 'phone', 'alipay')),
  encrypted_wallet TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步骤 3: 创建 verification_codes 表
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步骤 4: 创建索引以提高查询性能
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_alipay ON users(alipay_id);
CREATE INDEX idx_verification_codes_identifier ON verification_codes(identifier);
CREATE INDEX idx_verification_codes_expires ON verification_codes(expires_at);

-- 步骤 5: 启用 Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- 步骤 6: 创建宽松的 RLS 策略(允许所有访问)
-- 这对于使用 service role key 的后端应用是必需的

-- users 表策略
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON users
  FOR DELETE USING (true);

-- verification_codes 表策略
CREATE POLICY "Enable read access for verification codes" ON verification_codes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for verification codes" ON verification_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for verification codes" ON verification_codes
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for verification codes" ON verification_codes
  FOR DELETE USING (true);

-- 完成!数据库已初始化

