import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njlrsszxksbkclkveoyi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbHJzc3p4a3Nia2Nsa3Zlb3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDU2NjEsImV4cCI6MjA4OTIyMTY2MX0.A__sHhNFZ89RVg0cQTg3NuD1mK4n5_DzGmbzk6z7KqQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Fetching jobs...');
  const { data: jobs, error } = await supabase.from('jobs').select('id, title');
  
  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }
  
  if (!jobs || jobs.length === 0) {
    console.log('No jobs found.');
    return;
  }
  
  console.log('Found jobs:', JSON.stringify(jobs, null, 2));
}

main();
