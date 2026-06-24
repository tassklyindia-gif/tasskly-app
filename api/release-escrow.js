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

  const { job_id } = req.body;
  if (!job_id) {
    return res.status(400).json({ error: 'Missing required parameter: job_id' });
  }

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

    // Get the requester's profile role
    const { data: requesterProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !requesterProfile) {
      console.error("Requester profile not found:", profileErr);
      return res.status(404).json({ error: 'Requester profile not found.' });
    }

    const isAdmin = requesterProfile.role === 'admin';

    // Get job data to check if user is the poster
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobErr || !job) {
      console.error("Job not found:", jobErr);
      return res.status(404).json({ error: `Job with ID ${job_id} not found.` });
    }

    // Authorization check: Only Admin or the job Poster can release escrow
    const isPoster = job.poster_id === user.id;
    if (!isAdmin && !isPoster) {
      console.error(`User ${user.id} is not authorized to release escrow for job ${job_id}`);
      return res.status(403).json({ error: 'You are not authorized to release escrow for this job.' });
    }

    // Fetch the escrow transaction
    const { data: escrow, error: escrowErr } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('job_id', job_id)
      .eq('status', 'held')
      .maybeSingle();

    if (escrowErr || !escrow) {
      console.error("Escrow held record missing or error:", escrowErr);
      return res.status(400).json({ error: 'No active escrow transaction held for this job.' });
    }

    // 1. Update Escrow status
    const { error: escrowUpdateErr } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString()
      })
      .eq('id', escrow.id);

    if (escrowUpdateErr) {
      console.error("Escrow status update failed:", escrowUpdateErr);
      throw escrowUpdateErr;
    }

    // 2. Update Job status
    const { error: jobUpdateErr } = await supabase
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', job_id);

    if (jobUpdateErr) {
      console.error("Job status update failed:", jobUpdateErr);
      throw jobUpdateErr;
    }

    // 3. Unlock watermarked files
    const { error: filesUpdateErr } = await supabase
      .from('job_files')
      .update({ is_watermarked: false })
      .eq('job_id', job_id);

    if (filesUpdateErr) {
      console.error("Job files update failed:", filesUpdateErr);
    }

    // 4. Update worker's wallet balance
    if (escrow.worker_id) {
      const { data: workerProfile, error: workerErr } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', escrow.worker_id)
        .single();

      if (workerErr || !workerProfile) {
        console.error("Worker profile lookup failed:", workerErr);
        throw new Error("Failed to look up worker profile balance");
      }

      const newBalance = (workerProfile.wallet_balance || 0) + escrow.worker_amount;
      const { error: balanceUpdateErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', escrow.worker_id);

      if (balanceUpdateErr) {
        console.error("Worker balance update failed:", balanceUpdateErr);
        throw balanceUpdateErr;
      }
      
      console.log(`Successfully released ₹${escrow.worker_amount} to worker ${escrow.worker_id}. New balance: ₹${newBalance}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Escrow released and worker wallet updated successfully.'
    });
  } catch (err) {
    console.error("Error during escrow release request:", err);
    return res.status(500).json({ error: err.message || 'Internal server error during escrow release' });
  }
}
