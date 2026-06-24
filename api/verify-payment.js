import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { payment_id, expected_amount, job_id, bid_id } = req.body;

  if (!payment_id || !expected_amount || !job_id) {
    return res.status(400).json({ error: 'Missing required parameters (payment_id, expected_amount, job_id)' });
  }

  // Load Razorpay credentials
  let key_id = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  let key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;

  // Load Supabase credentials
  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fallback to local .env/.env.local parsing for local development
  if (!key_id || !key_secret || !supabaseUrl || !supabaseServiceKey) {
    try {
      const paths = [
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env')
      ];
      for (const envPath of paths) {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          if (!key_id) {
            const matchKey = envContent.match(/VITE_RAZORPAY_KEY_ID\s*=\s*(["']?)(.*?)\1(\s|$)/);
            if (matchKey && matchKey[2]) key_id = matchKey[2].trim();
          }
          if (!key_secret) {
            const matchSecret = envContent.match(/(VITE_)?RAZORPAY_KEY_SECRET\s*=\s*(["']?)(.*?)\1(\s|$)/);
            if (matchSecret && matchSecret[3]) key_secret = matchSecret[3].trim();
          }
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

  if (!key_id || !key_secret) {
    console.error("Razorpay API credentials missing from backend configuration.");
    return res.status(500).json({ error: 'Razorpay credentials not configured on backend' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase API credentials missing from backend configuration.");
    return res.status(500).json({ error: 'Supabase credentials not configured on backend' });
  }

  // Initialize Supabase Client with Admin service role bypass permissions
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch Job and Bid details from database first
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobErr || !job) {
      console.error("Job load error:", jobErr);
      return res.status(404).json({ error: `Job with ID ${job_id} not found.` });
    }

    let bid;
    if (!bid_id || bid_id === 'direct' || bid_id === 'none') {
      if (!job.worker_id) {
        return res.status(400).json({ error: 'Job does not have an assigned worker.' });
      }
      bid = {
        bidder_id: job.worker_id,
        amount: job.budget,
        status: 'accepted'
      };
    } else {
      const { data: dbBid, error: bidErr } = await supabase
        .from('bids')
        .select('*')
        .eq('id', bid_id)
        .single();

      if (bidErr || !dbBid) {
        console.error("Bid load error:", bidErr);
        return res.status(404).json({ error: `Bid with ID ${bid_id} not found.` });
      }
      bid = dbBid;
    }

    // Fetch profiles of both poster and worker
    const { data: posterProfile, error: posterProfileErr } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', job.poster_id)
      .single();

    if (posterProfileErr || !posterProfile) {
      console.error("Poster profile load error:", posterProfileErr);
      return res.status(404).json({ error: `Poster profile not found.` });
    }

    const { data: workerProfile, error: workerProfileErr } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', bid.bidder_id)
      .single();

    if (workerProfileErr || !workerProfile) {
      console.error("Worker profile load error:", workerProfileErr);
      return res.status(404).json({ error: `Worker profile not found.` });
    }

    // Idempotency: If job is already accepted and paid, return success immediately
    if (job.status === 'accepted' && bid.status === 'accepted') {
      const { data: existingEscrow } = await supabase
        .from('escrow_transactions')
        .select('id')
        .eq('job_id', job_id)
        .eq('status', 'held')
        .maybeSingle();

      if (existingEscrow) {
        console.log("Job already processed and paid, returning success.");
        return res.status(200).json({ success: true, already_processed: true });
      }
    }

    // 2. Fetch payment details from Razorpay to auto-verify capture status and amount
    const auth = Buffer.from(`${key_id}:${key_secret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Razorpay API request failed:", errorText);
      return res.status(400).json({ success: false, error: 'Failed to fetch payment details from Razorpay' });
    }

    const data = await response.json();

    // Verify payment state, amount, and currency
    const isSuccess = data.status === 'captured' || data.status === 'authorized';
    
    // Razorpay amounts are in paise (expected_amount * 100)
    const expectedPaise = Math.round(Number(expected_amount) * 100);
    const amountMatches = Math.abs(data.amount - expectedPaise) <= 5; // tolerance of 5 paise

    if (!isSuccess || !amountMatches || data.currency !== 'INR') {
      console.error("Payment verification checks failed:", {
        id: data.id,
        status: data.status,
        amount: data.amount,
        expectedPaise,
        currency: data.currency
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed (mismatched amount, status, or currency).' 
      });
    }

    console.log(`Payment confirmed on backend! ID: ${payment_id}, Amount: ₹${data.amount/100}`);

    // 3. Dynamically query worker's completed jobs to calculate their level & platform fee splits
    const { count, error: countErr } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', bid.bidder_id)
      .eq('status', 'completed');

    if (countErr) {
      console.error("Error fetching completed jobs count:", countErr);
    }

    const totalCompleted = count || 0;
    let feePercent = 30;
    let level = 1;

    if (totalCompleted >= 25) {
      level = 3;
      feePercent = 10;
    } else if (totalCompleted >= 10) {
      level = 2;
      feePercent = 20;
    }

    // 3.5 Prevent payment ID replay/reuse attacks
    const { data: duplicatePayment } = await supabase
      .from('escrow_transactions')
      .select('id')
      .eq('razorpay_payment_id', payment_id)
      .maybeSingle();

    if (duplicatePayment) {
      console.error(`Payment ID ${payment_id} has already been processed.`);
      return res.status(400).json({ error: 'This payment transaction has already been settled and processed.' });
    }

    const paidAmount = Number(expected_amount);
    const platformFee = Math.round(paidAmount * (feePercent / 100));
    const workerAmount = paidAmount - platformFee;

    // 4. Update Database rows sequentially
    // A. Insert Escrow Transaction
    const { error: escrowErr } = await supabase
      .from('escrow_transactions')
      .insert({
        job_id: job_id,
        poster_id: job.poster_id,
        worker_id: bid.bidder_id,
        total_amount: paidAmount,
        platform_fee: platformFee,
        worker_amount: workerAmount,
        status: 'held',
        razorpay_payment_id: payment_id,
        razorpay_order_id: data.order_id || null
      });

    if (escrowErr) {
      console.error("Escrow transaction insert error:", escrowErr);
      throw escrowErr;
    }

    // B. Update Job status
    const { error: jobUpdateErr } = await supabase
      .from('jobs')
      .update({
        worker_id: bid.bidder_id,
        status: 'accepted',
        instructions_locked: false,
        accepted_bid_id: (bid_id && bid_id !== 'direct' && bid_id !== 'none') ? bid_id : null,
        payment_due_at: null,
        budget: paidAmount
      })
      .eq('id', job_id);

    if (jobUpdateErr) {
      console.error("Job status update error:", jobUpdateErr);
      throw jobUpdateErr;
    }

    // C. Update accepted Bid status
    if (bid_id && bid_id !== 'direct' && bid_id !== 'none') {
      const { error: bidUpdateErr } = await supabase
        .from('bids')
        .update({ 
          status: 'accepted',
          amount: paidAmount
        })
        .eq('id', bid_id);

      if (bidUpdateErr) {
        console.error("Accepted bid update error:", bidUpdateErr);
        throw bidUpdateErr;
      }
    }

    // D. Reject all other bids on this job
    const { error: rejectBidsErr } = await supabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('job_id', job_id)
      .neq('id', bid_id);

    if (rejectBidsErr) {
      console.error("Other bids reject error:", rejectBidsErr);
    }

    // E. Insert Admin Ledger Entry
    const { error: ledgerErr } = await supabase
      .from('admin_ledger')
      .insert({
        job_id: job_id,
        type: 'fee_collected',
        amount: platformFee,
        from_user_id: job.poster_id,
        note: `Platform fee for: "${job.title}" (Worker Level ${level}, ${feePercent}% fee)`,
      });

    if (ledgerErr) {
      console.error("Ledger transaction insert error:", ledgerErr);
    }

    console.log("Fulfillment database operations completed successfully on backend.");

    // Send payment notification emails in background (non-blocking)
    sendPaymentNotificationEmails(
      job,
      bid,
      posterProfile,
      workerProfile,
      level,
      feePercent,
      workerAmount,
      bid.amount
    ).catch(e => console.error("Error sending notification emails:", e));

    return res.status(200).json({ 
      success: true, 
      status: 'success', 
      message: 'Payment verified and transaction settled automatically.' 
    });
  } catch (err) {
    console.error("Error during payment verification request:", err);
    return res.status(500).json({ error: err.message || 'Internal server error during verification' });
  }
}

async function sendPaymentNotificationEmails(job, bid, poster, worker, level, feePercent, workerAmount, totalAmount) {
  // Load email credentials
  let smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  let smtpPort = process.env.SMTP_PORT || '465';
  let smtpUser = process.env.SMTP_USER || 'info@tasskly.com';
  let smtpPassword = process.env.SMTP_PASSWORD;
  let smtpFrom = process.env.SMTP_FROM || `"Tasskly" <info@tasskly.com>`;
  let resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  let resendFrom = process.env.RESEND_FROM || 'Tasskly <info@tasskly.com>';

  // Fallback to local env files check
  if (!smtpPassword || !resendApiKey) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const paths = [
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env')
      ];
      for (const envPath of paths) {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          if (!smtpPassword) {
            const matchPassword = envContent.match(/SMTP_PASSWORD\s*=\s*(["']?)(.*?)\1(\s|$)/);
            if (matchPassword && matchPassword[2]) smtpPassword = matchPassword[2].trim();
          }
          if (!resendApiKey) {
            const matchResend = envContent.match(/(VITE_)?RESEND_API_KEY\s*=\s*(["']?)(.*?)\1(\s|$)/);
            if (matchResend && matchResend[3]) resendApiKey = matchResend[3].trim();
          }
        }
      }
    } catch (err) {
      console.error("Failed to load env vars for email fallback:", err);
    }
  }

  const posterSubject = `Payment Confirmed! Hired Expert Details for "${job.title}"`;
  const posterHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; border: 1px solid #eef2f6; box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Tasskly</h2>
        <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; font-weight: 500;">Payment Confirmed</p>
      </div>
      
      <div style="padding: 20px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 16px;">Job Details</h3>
        <p style="color: #475569; font-size: 14px; margin: 4px 0;"><strong>Job:</strong> ${job.title}</p>
        <p style="color: #475569; font-size: 14px; margin: 4px 0;"><strong>Total Budget:</strong> ₹${totalAmount}</p>
        <p style="color: #475569; font-size: 14px; margin: 4px 0;"><strong>Status:</strong> Escrow Secured (Held Safely) ✅</p>
      </div>

      <div style="padding: 20px; border-radius: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; margin-bottom: 24px;">
        <h3 style="color: #14532d; margin-top: 0; font-size: 16px;">Hired Worker Contact Details</h3>
        <p style="color: #166534; font-size: 14px; margin: 6px 0;"><strong>Name:</strong> ${worker.full_name || 'Worker'}</p>
        <p style="color: #166534; font-size: 14px; margin: 6px 0;"><strong>Phone:</strong> ${worker.phone || 'N/A'}</p>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
        The worker has been notified to start work immediately. You can view the project progress and communication details on your dashboard.
      </p>
      
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2026 Tasskly. All rights reserved.</p>
      </div>
    </div>
  `;

  const workerSubject = `Job Started! You're hired for "${job.title}"`;
  const workerHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; border: 1px solid #eef2f6; box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Tasskly</h2>
        <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; font-weight: 500;">You're Hired</p>
      </div>
      
      <div style="padding: 20px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 16px;">Job Details</h3>
        <p style="color: #475569; font-size: 14px; margin: 4px 0;"><strong>Job:</strong> ${job.title}</p>
        <p style="color: #475569; font-size: 14px; margin: 4px 0;"><strong>Total Budget:</strong> ₹${totalAmount}</p>
        <p style="color: #475569; font-size: 14px; margin: 4px 0;"><strong>Your Level:</strong> Level ${level} (${feePercent}% Platform Fee)</p>
        <p style="color: #475569; font-size: 16px; margin: 8px 0 4px 0; color: #6366f1;"><strong>Your Earnings Payout:</strong> ₹${workerAmount}</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 4px;">(This amount is secured in escrow and will be credited to your wallet balance once the work is approved by the poster)</p>
      </div>

      <div style="padding: 20px; border-radius: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; margin-bottom: 24px;">
        <h3 style="color: #14532d; margin-top: 0; font-size: 16px;">Client Contact Details</h3>
        <p style="color: #166534; font-size: 14px; margin: 6px 0;"><strong>Name:</strong> ${poster.full_name || 'Client'}</p>
        <p style="color: #166534; font-size: 14px; margin: 6px 0;"><strong>Email:</strong> <a href="mailto:${poster.email}" style="color: #15803d; font-weight: 600; text-decoration: underline;">${poster.email}</a></p>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
        Please coordinate with the client and submit your deliverables before the deadline.
      </p>
      
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2026 Tasskly. All rights reserved.</p>
      </div>
    </div>
  `;

  // Send function that tries SMTP and falls back to Resend API
  const sendEmail = async (to, subject, html) => {
    let sent = false;
    // 1. Try SMTP if configured
    if (smtpPassword) {
      try {
        let transportConfig;
        if (smtpHost.toLowerCase().includes('gmail')) {
          transportConfig = {
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPassword }
          };
        } else {
          transportConfig = {
            host: smtpHost,
            port: parseInt(smtpPort) || 465,
            secure: parseInt(smtpPort) === 465,
            auth: { user: smtpUser, pass: smtpPassword }
          };
        }
        const transporter = nodemailer.createTransport(transportConfig);
        await transporter.sendMail({
          from: smtpFrom,
          to: to,
          bcc: ['info@tasskly.com'],
          subject: subject,
          html: html,
        });
        console.log(`Email sent successfully via SMTP to: ${to}`);
        sent = true;
      } catch (err) {
        console.error(`SMTP error sending to ${to}:`, err);
      }
    }

    // 2. Try Resend if not sent and apiKey exists
    if (!sent && resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: resendFrom,
            to: to,
            bcc: ['info@tasskly.com'],
            subject: subject,
            html: html,
          }),
        });

        if (response.ok) {
          console.log(`Email sent successfully via Resend to: ${to}`);
          sent = true;
        } else {
          const errText = await response.text();
          console.error(`Resend API error sending to ${to}:`, errText);
        }
      } catch (err) {
        console.error(`Resend fetch error sending to ${to}:`, err);
      }
    }

    if (!sent) {
      console.warn(`Could not send payment notification email to: ${to} (credentials missing or error occurred)`);
    }
  };

  // Send to both
  await Promise.all([
    sendEmail(poster.email, posterSubject, posterHtml),
    sendEmail(worker.email, workerSubject, workerHtml)
  ]);
}
