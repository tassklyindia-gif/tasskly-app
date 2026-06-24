// Production trigger with loaded SMTP keys
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, type } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // Debug environment keys safely without printing full secrets
  console.log("Loaded SMTP/Resend keys:", Object.keys(process.env).filter(k => k.startsWith("SMTP") || k.includes("RESEND")));
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_PASSWORD details:", {
    exists: !!process.env.SMTP_PASSWORD,
    length: process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.length : 0,
    masked: process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.trim().substring(0, 3) + "..." : "none"
  });

  const subject = type === 'signup' ? 'Verify your Tasskly Account' : 'Tasskly Secure Sign In OTP';
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; border: 1px solid #eef2f6; box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Tasskly</h2>
        <p style="color: #64748b; font-size: 14px; margin: 6px 0 0 0; font-weight: 500;">India's Student Marketplace</p>
      </div>
      
      <div style="padding: 24px; border-radius: 12px; background: linear-gradient(135deg, #bae6fd 0%, #a7f3d0 100%); border: 1px solid #f1f5f9; text-align: center; margin-bottom: 24px;">
        <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; font-weight: 600;">Here is your secure 6-digit verification code:</p>
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #6366f1; font-family: monospace; margin: 12px 0;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin: 16px 0 0 0; font-weight: 500;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
        If you didn't request this code, you can safely ignore this email.
      </p>
      
      <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2026 Tasskly. All rights reserved.</p>
      </div>
    </div>
  `;

  const errors = [];

  // 1. Try SMTP if configured
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = process.env.SMTP_PORT || '465';
  const smtpUser = process.env.SMTP_USER || 'info@tasskly.com';
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || `"Tasskly" <info@tasskly.com>`;

  let smtpAttempted = false;
  // SMTP block disabled to force Resend usage exclusively
  if (false && smtpHost && smtpUser && smtpPassword) {
    smtpAttempted = true;
    try {
      let transportConfig;
      
      // If Gmail, use nodemailer's built-in official 'gmail' service to bypass custom SSL/TLS port issues
      if (smtpHost.toLowerCase().includes('gmail')) {
        transportConfig = {
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        };
      } else {
        transportConfig = {
          host: smtpHost,
          port: parseInt(smtpPort) || 465,
          secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        };
      }

      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        bcc: ['info@tasskly.com'],
        subject: subject,
        html: htmlContent,
      });

      return res.status(200).json({ success: true, message: 'OTP sent successfully via SMTP' });
    } catch (err) {
      console.error('SMTP error:', err);
      errors.push(`SMTP Error: ${err.message || err}`);
    }
  }

  // 2. Try Resend API if VITE_RESEND_API_KEY / RESEND_API_KEY is configured
  const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  let resendAttempted = false;
  if (resendApiKey) {
    resendAttempted = true;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Tasskly <info@tasskly.com>',
          to: email,
          bcc: ['info@tasskly.com'],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (response.ok) {
        return res.status(200).json({ success: true, message: 'OTP sent successfully via Resend' });
      } else {
        const errText = await response.text();
        console.error('Resend API error:', errText);
        errors.push(`Resend API Error: ${errText}`);
      }
    } catch (err) {
      console.error('Resend fetch error:', err);
      errors.push(`Resend Error: ${err.message || err}`);
    }
  }

  // If we reach here, neither succeeded or were configured. Return fallback response.
  let errorMsg = 'SMTP/Resend not fully configured on Vercel yet.';
  if (smtpAttempted || resendAttempted) {
    errorMsg = `Failed to send email. Details: ${errors.join(' | ')}`;
  }

  return res.status(200).json({
    success: false,
    message: errorMsg,
    devFallback: true,
  });
}
