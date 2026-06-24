import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid or missing withdrawal amount' });
  }
  const withdrawalAmount = Number(amount);

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  const token = authHeader.replace('Bearer ', '');

  // Load Supabase credentials
  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fallback to local .env/.env.local parsing for local development
  if (!supabaseUrl || !supabaseServiceKey) {
    try {
      const paths = [
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env')
      ];
      for (const envPath of paths) {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          if (!supabaseUrl) {
            const matchUrl = envContent.match(/VITE_SUPABASE_URL\s*=\s*(["']?)(.*?)\1(\s|$)/);
            if (matchUrl && matchUrl[2]) supabaseUrl = matchUrl[2].trim();
          }
          if (!supabaseServiceKey) {
            const matchServKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(["']?)(.*?)\1(\s|$)/);
            if (matchServKey && matchServKey[2]) supabaseServiceKey = matchServKey[2].trim();
          }
        }
      }
    } catch (err) {
      console.error("Failed to parse env files dynamically:", err);
    }
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase API credentials missing from backend configuration.");
    return res.status(500).json({ error: 'Supabase credentials not configured on backend' });
  }

  // Initialize Supabase Client with Admin service role bypass permissions
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate the user token using Supabase Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      console.error("Auth verification failed:", authErr);
      return res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
    }

    // Get the user's profile and bank account details
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('wallet_balance, bank_name, bank_account_number, bank_ifsc_code, bank_account_holder_name, bank_verification_status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      console.error("Profile not found:", profileErr);
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Check if bank account has been verified by the backend
    if (profile.bank_verification_status !== 'verified') {
      return res.status(400).json({ 
        error: 'Your bank account details have not been verified by the backend. Please add and automatically verify them in your profile settings.' 
      });
    }

    // Check if bank account details are filled
    const { bank_name, bank_account_number, bank_ifsc_code, bank_account_holder_name } = profile;
    if (!bank_name || !bank_account_number || !bank_ifsc_code || !bank_account_holder_name) {
      return res.status(400).json({ 
        error: 'Please configure your bank account details in your profile first before requesting a withdrawal.' 
      });
    }

    // Validate if the user has enough wallet balance
    const currentBalance = Number(profile.wallet_balance) || 0;
    if (currentBalance < withdrawalAmount) {
      return res.status(400).json({ 
        error: `Insufficient balance. Available balance is ₹${currentBalance}.` 
      });
    }

    // 1. Deduct withdrawal amount from user's wallet balance
    const newBalance = currentBalance - withdrawalAmount;
    const { error: balanceUpdateErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    if (balanceUpdateErr) {
      console.error("Failed to update wallet balance:", balanceUpdateErr);
      throw new Error("Failed to deduct amount from wallet balance");
    }

    // 2. Create the pending withdrawal record
    const { error: withdrawalErr } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount: withdrawalAmount,
        status: 'pending',
        bank_name,
        bank_account_number,
        bank_ifsc_code,
        bank_account_holder_name
      });

    if (withdrawalErr) {
      console.error("Failed to insert withdrawal transaction:", withdrawalErr);
      // Rollback wallet balance update
      await supabase
        .from('profiles')
        .update({ wallet_balance: currentBalance })
        .eq('id', user.id);
      throw new Error("Failed to register withdrawal request");
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Withdrawal request submitted successfully.',
      new_balance: newBalance
    });
  } catch (err) {
    console.error("Error processing withdrawal request:", err);
    return res.status(500).json({ error: err.message || 'Internal server error during withdrawal request' });
  }
}
