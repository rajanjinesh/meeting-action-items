require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verifySupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Supabase URL or Key missing in .env.local');
    process.exit(1);
  }

  console.log('Testing Supabase REST API connection...');
  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase.from('action_items').select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      console.log('Supabase API connection VERIFIED! (Project reachable; action_items table awaiting DDL execution)');
    } else if (error) {
      console.log('Supabase error:', error.code, error.message);
    } else {
      console.log('Supabase API connection & action_items table VERIFIED! Current rows:', data?.length ?? 0);
    }
  } catch (err) {
    console.error('Supabase error:', err.message);
    process.exit(1);
  }
}

verifySupabase();
