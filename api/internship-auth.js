import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

  const { tasskly_id, password, action } = req.body;
  if (!tasskly_id || !action || (action !== 'check' && action !== 'setup' && action !== 'login')) {
    return res.status(400).json({ error: 'Invalid or missing parameters (tasskly_id, action)' });
  }

  // Load Supabase credentials
  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fallback to local env parsing for local development
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
    return res.status(500).json({ error: 'Supabase credentials not configured on backend' });
  }

  // Initialize Supabase Client with service role to bypass user RLS policies for search
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch user by Tasskly ID
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('tasskly_id', tasskly_id.trim())
      .maybeSingle();

    if (profileErr) {
      console.error("Database query error:", profileErr);
      return res.status(500).json({ error: 'Database search error' });
    }

    if (!profile) {
      return res.status(404).json({ error: `Tasskly ID "${tasskly_id}" is not registered on this platform.` });
    }

    // 2. Process Actions
    if (action === 'check') {
      return res.status(200).json({
        success: true,
        hasPassword: !!profile.internship_password,
        name: profile.full_name || 'Tasskly User'
      });
    }

    if (action === 'setup') {
      if (profile.internship_password) {
        return res.status(400).json({ error: 'Password has already been set for this Tasskly ID. Please log in.' });
      }

      if (!password || password.trim().length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Hash the password securely with SHA-256
      const hashedPassword = crypto.createHash('sha256').update(password.trim()).digest('hex');

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ internship_password: hashedPassword })
        .eq('id', profile.id);

      if (updateErr) {
        console.error("Failed to set internship password:", updateErr);
        return res.status(500).json({ error: 'Failed to save password in database.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Password successfully set up! You can now log in.'
      });
    }

    if (action === 'login') {
      if (!profile.internship_password) {
        return res.status(400).json({ error: 'Password not set. Please complete password setup first.' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Password is required to log in.' });
      }

      const hashedPassword = crypto.createHash('sha256').update(password.trim()).digest('hex');

      if (hashedPassword !== profile.internship_password) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      // Successful login
      return res.status(200).json({
        success: true,
        user: {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          tasskly_id: profile.tasskly_id,
          avatar_url: profile.avatar_url,
          role: profile.role
        }
      });
    }

  } catch (err) {
    console.error("Error in internship-auth function:", err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
