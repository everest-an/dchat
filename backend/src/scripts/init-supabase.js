const { supabase } = require('../config/supabase');

async function initDatabase() {
  console.log('🚀 Initializing Supabase database...');

  try {
    // Create users table
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
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
      `
    });

    if (usersError) {
      console.log('ℹ️  Users table might already exist or RPC not available');
      console.log('   Trying direct table check...');
      
      // Try to query the table to see if it exists
      const { data, error } = await supabase.from('users').select('id').limit(1);
      
      if (error && error.code === '42P01') {
        console.error('❌ Users table does not exist. Please create it manually in Supabase SQL Editor.');
        console.log('\n📋 SQL to run in Supabase:');
        console.log(getSQLScript());
        return false;
      } else {
        console.log('✅ Users table exists');
      }
    } else {
      console.log('✅ Users table created');
    }

    // Check verification_codes table
    const { data: vcData, error: vcError } = await supabase
      .from('verification_codes')
      .select('id')
      .limit(1);
    
    if (vcError && vcError.code === '42P01') {
      console.error('❌ Verification codes table does not exist. Please create it manually.');
      console.log('\n📋 SQL to run in Supabase:');
      console.log(getSQLScript());
      return false;
    } else {
      console.log('✅ Verification codes table exists');
    }

    console.log('\n✅ Database initialization complete!');
    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
    console.log(getSQLScript());
    return false;
  }
}

function getSQLScript() {
  return `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_identifier ON verification_codes(identifier);
  `;
}

// Run if called directly
if (require.main === module) {
  initDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { initDatabase };

