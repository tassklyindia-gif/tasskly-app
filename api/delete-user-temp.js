import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    return res.status(500).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel settings.'
    });
  }

  // Authorize using Authorization header or secret query parameter
  const authHeader = req.headers.authorization;
  const secretQuery = req.query.secret;

  if (authHeader !== `Bearer ${supabaseServiceKey}` && secretQuery !== supabaseServiceKey) {
    return res.status(401).json({
      error: 'Unauthorized. Access is restricted to authorized administrative requests.'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch all users from Supabase Auth admin API
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const users = data?.users || [];
    const deleteCount = users.length;

    // 2. Delete all users from Auth (cascades to profiles due to constraint rules)
    for (const user of users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Failed to delete user ${user.id}:`, deleteError);
      }
    }

    // 3. Clear any remaining public profile rows (orphans if any)
    const { error: clearProfilesError } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (clearProfilesError) throw clearProfilesError;

    return res.status(200).json({
      success: true,
      message: `Successfully cleared all user logins. Deleted ${deleteCount} user accounts from the database.`
    });
  } catch (err) {
    console.error('Clear users database error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An error occurred while clearing user logins.'
    });
  }
}
