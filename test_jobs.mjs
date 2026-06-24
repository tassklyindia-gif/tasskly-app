import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://njlrsszxksbkclkveoyi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbHJzc3p4a3Nia2Nsa3Zlb3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDU2NjEsImV4cCI6MjA4OTIyMTY2MX0.A__sHhNFZ89RVg0cQTg3NuD1mK4n5_DzGmbzk6z7KqQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFetch() {
  console.log("Fetching jobs from Supabase...");
  const { data, error } = await supabase
    .from('jobs')
    .select('*, poster:profiles!jobs_poster_id_fkey(full_name, avatar_url)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Query failed with error:", error);
  } else {
    console.log("Successfully fetched jobs. Total:", data.length);
    console.log("Sample job data:", data[0]);
  }
}

testFetch();
