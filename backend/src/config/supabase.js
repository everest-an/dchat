const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || ''; // MUST be set via environment variable
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // MUST be set via environment variable

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase client initialized:', supabaseUrl);

// Test connection function
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection test passed');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    return false;
  }
};

module.exports = { supabase, testConnection };

