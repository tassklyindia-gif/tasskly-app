// Run this once to apply migrations that couldn't be applied via the local Supabase CLI
// Usage: node apply_migrations.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://njlrsszxksbkclkveoyi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbHJzc3p4a3Nia2Nsa3Zlb3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDU2NjEsImV4cCI6MjA4OTIyMTY2MX0.A__sHhNFZ89RVg0cQTg3NuD1mK4n5_DzGmbzk6z7KqQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connection by fetching a profile (to verify anon key works)
const { data, error } = await supabase.from('profiles').select('id, upi_id').limit(1);

if (error) {
  if (error.message.includes('column') && error.message.includes('upi_id')) {
    console.log('❌ upi_id column does NOT exist yet.');
    console.log('\n📋 Please run this SQL in your Supabase Dashboard > SQL Editor:');
    console.log('\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;\n');
    console.log('URL: https://supabase.com/dashboard/project/njlrsszxksbkclkveoyi/sql\n');
  } else {
    console.error('Connection error:', error);
  }
} else {
  console.log('✅ upi_id column EXISTS and is working!');
  console.log('Sample data:', data);
}
