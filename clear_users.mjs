import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://njlrsszxksbkclkveoyi.supabase.co';
const serviceKey = process.argv[2];

if (!serviceKey) {
  console.error('\x1b[31mError: Please provide your Supabase SUPABASE_SERVICE_ROLE_KEY as an argument.\x1b[0m');
  console.log('Usage: node clear_users.mjs <YOUR_SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, serviceKey);

async function clearDatabase() {
  console.log('Connecting to Supabase...');
  try {
    // 1. Fetch all users from Supabase Auth admin API
    console.log('Fetching all users from Supabase Auth...');
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const users = data?.users || [];
    console.log(`Found ${users.length} users in Auth.`);

    // 2. Delete all users from Auth
    for (const user of users) {
      console.log(`Deleting user: ${user.email} (${user.id})...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Failed to delete user ${user.id}:`, deleteError.message);
      } else {
        console.log(`Successfully deleted ${user.email}`);
      }
    }

    // 3. Clear any remaining public profile rows (orphans if any)
    console.log('Clearing remaining public profile rows...');
    const { error: clearProfilesError } = await supabase
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (clearProfilesError) throw clearProfilesError;

    console.log('\x1b[32mSuccessfully cleared all user logins, admins, and profiles from the database!\x1b[0m');
  } catch (err) {
    console.error('\x1b[31mAn error occurred:\x1b[0m', err.message || err);
  }
}

clearDatabase();
