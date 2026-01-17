const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://gvjmwsltxcpyxhmfwlrs.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2am13c2x0eGNweXhobWZ3bHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTQxNjUsImV4cCI6MjA3NjM5MDE2NX0.faGQtZj26MzQ4BECr3IZr1AyGMHc847l6m7eNgRZZ30';

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

