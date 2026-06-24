import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!url || !key) {
    return res.status(200).json({ error: 'Supabase URL or Key missing in Vercel env' });
  }

  const supabase = createClient(url, key);
  
  // Test 1: Fetch a profile
  const { data: profiles, error: selectErr } = await supabase
    .from('profiles')
    .select('id, full_name, bank_verification_status')
    .limit(1);
    
  // Test 2: Try update query with all bank columns
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      bank_name: 'Test Bank',
      bank_account_number: '1234567890',
      bank_ifsc_code: 'SBIN0001234',
      bank_account_holder_name: 'TEST HOLDER',
      bank_verification_status: 'unverified'
    })
    .eq('id', '00000000-0000-0000-0000-000000000000'); // safe, non-existent UUID

  res.status(200).json({
    selectSuccess: !selectErr,
    selectError: selectErr ? selectErr.message : null,
    profileSample: profiles ? profiles[0] : null,
    updateSuccess: !updateErr,
    updateError: updateErr ? { code: updateErr.code, message: updateErr.message } : null
  });
}
