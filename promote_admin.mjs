import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://njlrsszxksbkclkveoyi.supabase.co';
const serviceKey = process.argv[2];
const emailToPromote = process.argv[3] || 'shrikarakarapu@gmail.com';

if (!serviceKey) {
  console.error('\x1b[31mError: Please provide your Supabase SUPABASE_SERVICE_ROLE_KEY as the first argument.\x1b[0m');
  console.log('Usage: node promote_admin.mjs <YOUR_SERVICE_ROLE_KEY> [email_to_promote]');
  console.log('Example: node promote_admin.mjs your_key_here shrikarakarapu@gmail.com');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, serviceKey);

async function promoteUser() {
  console.log(`Connecting to Supabase to promote: ${emailToPromote}...`);
  try {
    // 1. Fetch profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', emailToPromote)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!profile) {
      console.error(`\x1b[31mError: Profile for email "${emailToPromote}" not found in database.\x1b[0m`);
      process.exit(1);
    }

    console.log(`Found profile: ${profile.full_name} (${profile.email}), current role: ${profile.role}`);

    if (profile.role === 'admin') {
      console.log(`\x1b[33mUser is already an admin!\x1b[0m`);
      return;
    }

    // 2. Update role to admin
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', profile.id)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    console.log(`\x1b[32mSuccessfully promoted ${emailToPromote} to admin!\x1b[0m`);
    console.log('Updated Profile:', updated);
  } catch (err) {
    console.error('\x1b[31mAn error occurred:\x1b[0m', err.message || err);
  }
}

promoteUser();
