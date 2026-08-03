import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { signAccessToken, signRefreshToken, verifyToken } from './src/utils/jwt.js';
import { auth, requireRole } from './src/middleware/auth.js';
import { generateDocumentId, detectEmploymentType, buildPlaceholders, generateOfferLetterHtml, selectTemplate } from './src/services/offerLetterService.js';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'https://leave.thecorvusstudio.com',
        'http://localhost:5173',
        'http://localhost:3000',
      ];
      if (allowed.includes(origin)) {
        return origin;
      }
      return 'https://leave.thecorvusstudio.com';
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Simple in-memory rate limiter (per-isolate) to prevent brute-forcing and abuse
const rateLimitMap = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function checkRateLimit(ip, type, limit, periodMs) {
  const now = Date.now();
  
  // Occasional cleanup to prevent memory leaks
  if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
    lastCleanup = now;
  }

  const key = `${type}:${ip}`;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + periodMs
    });
    return true; // allowed
  }

  if (record.count >= limit) {
    return false; // rate limited
  }

  record.count += 1;
  return true; // allowed
}


const OTP_TTL_MS = 5 * 60 * 1000;

const SICK_UUID = "22222222-2222-2222-2222-222222222222";
const CASUAL_UUID = "33333333-3333-3333-3333-333333333333";
const EMERGENCY_UUID = "44444444-4444-4444-4444-444444444444";

function mapDbToFrontendLeaveTypeId(dbId) {
  if (dbId === 1 || String(dbId) === '1') return SICK_UUID;
  if (dbId === 2 || String(dbId) === '2') return CASUAL_UUID;
  if (dbId === 3 || String(dbId) === '3') return EMERGENCY_UUID;
  return dbId;
}

function mapFrontendToDbLeaveTypeId(frontendId) {
  if (frontendId === SICK_UUID) return 1;
  if (frontendId === CASUAL_UUID) return 2;
  if (frontendId === EMERGENCY_UUID) return 3;
  if (frontendId === 1 || frontendId === '1') return 1;
  if (frontendId === 2 || frontendId === '2') return 2;
  if (frontendId === 3 || frontendId === '3') return 3;
  return frontendId;
}

function generateOtp() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String((bytes[0] % 900000) + 100000);
}

/**
 * Hash a value with SHA-256 using the Web Crypto API (available in CF Workers).
 * Used to avoid storing OTPs in plaintext.
 */
async function hashValue(value) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendOtpEmail(apiKey, to, otp) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Corvus Leave System <noreply@thecorvusstudio.com>',
      to,
      subject: 'Your OTP for Corvus Leave System',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
          <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; text-align: center;">
            <h2 style="margin: 0 0 10px; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">CORVUS STUDIO</h2>
            <div style="text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #64748b; margin-bottom: 30px;">Leave System</div>
            
            <p style="color: #475569; font-size: 15px; margin-bottom: 25px; line-height: 1.5;">You are attempting to log in to the Corvus Leave System. Please use the following One-Time Password to complete your authentication.</p>
            
            <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 20px; margin-bottom: 25px; display: inline-block;">
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0d9488; margin-left: 8px;">${otp}</div>
            </div>
            
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">This security code expires in <strong>5 minutes</strong>. If you did not request this, please ignore this email.</p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend failed: ${response.status} ${errorText}`);
  }
}

async function sendNotificationEmail(apiKey, { to, cc, subject, html, attachments }) {
  try {
    const payload = {
      from: 'Corvus Leave System <noreply@thecorvusstudio.com>',
      to,
      cc,
      subject,
      html,
    };
    if (attachments && Array.isArray(attachments)) {
      payload.attachments = attachments;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend notification failed: ${response.status} ${errorText}`);
    }
  } catch (err) {
    console.error(`Error in sendNotificationEmail: ${err.message}`);
  }
}

async function sendWelcomeEmail(apiKey, to, fullName) {
  try {
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">

          <!-- Header -->
          <div style="background-color: #0f172a; padding: 32px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">CORVUS STUDIO</h2>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Leave Management System</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 32px;">
            <p style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 8px;">Welcome to Corvus Studio, ${fullName}! 🎉</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
              Your account has been provisioned in the <strong>Corvus Studio Leave Management System</strong>. This is your central hub for managing leave requests, tracking balances, and staying informed about studio holidays.
            </p>

            <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
              <p style="margin: 0 0 10px; color: #0d9488; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Getting Started</p>
              <ul style="margin: 0; padding-left: 18px; color: #0f172a; font-size: 13px; line-height: 1.8;">
                <li>Log in using your <strong>work email</strong> at the portal</li>
                <li>Apply for leave directly from your dashboard</li>
                <li>Track your leave balances in real-time</li>
                <li>View studio holiday calendar for the year</li>
              </ul>
            </div>

            <p style="color: #475569; font-size: 13px; line-height: 1.7; margin: 0 0 24px;">
              For any assistance, please contact your <strong>team lead</strong> or <strong>manager</strong>. They'll be happy to guide you through the system.
            </p>

            <div style="text-align: center; margin-top: 8px;">
              <a href="https://leave.thecorvusstudio.com" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">Access Your Dashboard &rarr;</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">This is an automated message from the Corvus Studio Leave System. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Corvus Studio <noreply@thecorvusstudio.com>',
        to,
        subject: 'Welcome to Corvus Studio — Your Leave Portal is Ready',
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Welcome email failed: ${response.status} ${errorText}`);
    }
  } catch (err) {
    console.error(`Error in sendWelcomeEmail: ${err.message}`);
  }
}

function getNotificationCcList(employeeEmail, department = null) {
  const ccEmails = [
    employeeEmail,
    'raj@thecorvusstudio.com',
    'yash@thecorvusstudio.com',
  ];
  
  // Route to specific team leads based on the employee's department
  if (department === 'Production') {
    ccEmails.push('aryan@thecorvusstudio.com');
  } else if (department === 'Creative' || department === 'Design') {
    ccEmails.push('keshav@thecorvusstudio.com');
  } else {
    // If no department or different department, CC all leads just in case,
    // or you could leave it empty. We will CC them to ensure no request is missed.
    ccEmails.push('aryan@thecorvusstudio.com');
    ccEmails.push('keshav@thecorvusstudio.com');
  }

  return Array.from(
    new Set(
      ccEmails
        .filter(Boolean)
        .map(email => email.toLowerCase().trim())
    )
  ).filter(email => email !== 'nihar@thecorvusstudio.com'); // Nihar is excluded as per older logic
}



async function sendLeaveAppliedEmail(env, ctx, employeeName, employeeEmail, department, leaveType, fromDate, toDate, leaveCount, reason) {
  const subject = `[Leave Applied] ${employeeName} - ${leaveType} (${leaveCount} Day${leaveCount > 1 ? 's' : ''})`;
  const cc = getNotificationCcList(employeeEmail, department);
  
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Corvus Studio</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">Leave Application Notification</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hello Nihar,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            A new leave application has been submitted by <strong>${employeeName}</strong>. Here are the details:
          </p>
          
          <!-- Detail Card -->
          <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; width: 35%;">Employee</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Leave Type</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${leaveType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Duration</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${fromDate} to ${toDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Total Days</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${leaveCount} Day${leaveCount > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; vertical-align: top;">Reason</td>
                <td style="padding: 8px 0; color: #334155; font-size: 14px; line-height: 1.5;">${reason || 'No reason provided.'}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://leave.thecorvusstudio.com" style="background-color: #0d9488; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block;">
              Open Management Portal
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
          This is an automated notification from the Corvus Studio Leave Portal.<br>
          © 2026 Corvus Studio. All rights reserved.
        </div>
      </div>
    </div>
  `;

  await sendNotificationEmail(env.RESEND_API_KEY, {
    to: 'nihar@thecorvusstudio.com',
    cc,
    subject,
    html
  });
}

async function sendHolidayBroadcastEmail(env, ctx, users, holidayName, holidayDate) {
  const subject = `[Holiday Alert] Tomorrow is ${holidayName}!`;
  
  const bcc = users.map(u => u.work_email).filter(Boolean);
  if (bcc.length === 0) return;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Corvus Studio</h2>
          <p style="margin: 4px 0 0 0; color: #38bdf8; font-size: 14px;">Holiday Announcement</p>
        </div>
        <div style="padding: 32px; text-align: center;">
          <h3 style="font-size: 20px; color: #0f172a; margin-top: 0;">Happy Holidays! 🎉</h3>
          <p style="font-size: 16px; line-height: 1.6; color: #475569;">
            This is a friendly reminder that tomorrow, <strong>${holidayDate}</strong>, is a studio holiday in observance of <strong>${holidayName}</strong>.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-top: 20px;">
            Enjoy your day off!
          </p>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
          This is an automated notification from the Corvus Studio Leave Portal.<br>
          © 2026 Corvus Studio. All rights reserved.
        </div>
      </div>
    </div>
  `;

  await sendNotificationEmail(env.RESEND_API_KEY, {
    to: 'noreply@thecorvusstudio.com',
    bcc,
    subject,
    html
  });
}

async function sendLeaveStartingReminderEmail(env, ctx, req) {
  const subject = `[Leave Reminder] ${req.full_name} is on ${req.leave_type} Tomorrow`;
  const cc = getNotificationCcList(req.work_email, req.department);

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Corvus Studio</h2>
          <p style="margin: 4px 0 0 0; color: #f59e0b; font-size: 14px;">Leave Reminder</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hello Team,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            This is an automated reminder that <strong>${req.full_name}</strong> will be on <strong>${req.leave_type}</strong> starting tomorrow.
          </p>
          <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; width: 35%;">Employee</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${req.full_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Duration</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${req.from_date} to ${req.to_date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; vertical-align: top;">Reason</td>
                <td style="padding: 8px 0; color: #334155; font-size: 14px; line-height: 1.5;">${req.reason || 'No reason provided.'}</td>
              </tr>
            </table>
          </div>
        </div>
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
          This is an automated notification from the Corvus Studio Leave Portal.<br>
          © 2026 Corvus Studio. All rights reserved.
        </div>
      </div>
    </div>
  `;

  await sendNotificationEmail(env.RESEND_API_KEY, {
    to: req.work_email,
    cc,
    subject,
    html
  });
}


async function sendLeaveStatusChangedEmail(env, ctx, employeeName, employeeEmail, leaveType, fromDate, toDate, leaveCount, reason, status, managerComment) {
  const subject = `[Leave ${status.toUpperCase()}] ${employeeName} - ${leaveType}`;
  const cc = getNotificationCcList(employeeEmail);
  
  const statusColor = status.toLowerCase() === 'approved' ? '#0d9488' : '#e11d48';
  
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Corvus Studio</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 14px;">Leave Request Update</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hello Team,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            The leave request submitted by <strong>${employeeName}</strong> has been <strong style="color: ${statusColor}; text-transform: uppercase;">${status}</strong>.
          </p>
          
          <!-- Detail Card -->
          <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; width: 35%;">Employee</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Leave Type</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${leaveType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Duration</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${fromDate} to ${toDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Total Days</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${leaveCount} Day${leaveCount > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; vertical-align: top;">Reason</td>
                <td style="padding: 8px 0; color: #334155; font-size: 14px; line-height: 1.5;">${reason || 'No reason provided.'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Decision</td>
                <td style="padding: 8px 0; color: ${statusColor}; font-size: 14px; font-weight: 800; text-transform: uppercase;">${status}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; vertical-align: top;">Manager Comment</td>
                <td style="padding: 8px 0; color: #334155; font-size: 14px; line-height: 1.5; font-style: italic;">"${managerComment || 'No comment provided.'}"</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://leave.thecorvusstudio.com" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block;">
              Open Leave Portal
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
          This is an automated notification from the Corvus Studio Leave Portal.<br>
          © 2026 Corvus Studio. All rights reserved.
        </div>
      </div>
    </div>
  `;

  await sendNotificationEmail(env.RESEND_API_KEY, {
    to: 'nihar@thecorvusstudio.com',
    cc,
    subject,
    html
  });
}

async function sendPrescriptionUploadedEmail(env, employeeName, employeeEmail, leaveType, fromDate, toDate, leaveCount, docUrl) {
  const subject = `[Prescription Uploaded] ${employeeName} - ${leaveType}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Corvus Studio</h2>
          <p style="margin: 4px 0 0 0; color: #0d9488; font-size: 14px;">Prescription Upload Notification</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hello Admin,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Employee <strong>${employeeName}</strong> has uploaded a medical prescription for their Sick Leave request.
          </p>
          
          <!-- Detail Card -->
          <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; width: 35%;">Employee</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${employeeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Leave Type</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${leaveType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Duration</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${fromDate} to ${toDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Total Days</td>
                <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${leaveCount} Day${leaveCount > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; vertical-align: top;">Document</td>
                <td style="padding: 8px 0; color: #0d9488; font-size: 14px; font-weight: 700; word-break: break-all;">
                  <a href="${docUrl}" target="_blank" style="color: #0d9488; text-decoration: underline;">View Prescription URL</a>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://leave.thecorvusstudio.com/approvals" style="background-color: #0d9488; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block;">
              Open Approval Center
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
          This is an automated notification from the Corvus Studio Leave Portal.<br>
          © 2026 Corvus Studio. All rights reserved.
        </div>
      </div>
    </div>
  `;

  await sendNotificationEmail(env.RESEND_API_KEY, {
    to: 'raj@thecorvusstudio.com',
    cc: ['yash@thecorvusstudio.com', 'nihar@thecorvusstudio.com'],
    subject,
    html
  });
}

async function handleScheduledReminders(env) {
  try {
    const list = await env.DB.prepare(`
      SELECT lr.id, lr.leave_type, lr.from_date, lr.to_date, lr.leave_count, lr.created_at, u.id as employee_id, u.full_name, u.work_email
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE lr.leave_type = 'Sick Leave'
        AND lr.medical_document_path IS NULL
        AND lr.status != 'rejected'
        AND lr.created_at <= datetime('now', '-3 days')
        AND lr.created_at >= datetime('now', '-10 days')
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs al 
          WHERE al.action = 'SICK_LEAVE_REMINDER_SENT' 
            AND al.details = CAST(lr.id AS TEXT)
        )
    `).all();

    if (!list || !list.results || list.results.length === 0) {
      console.log('No sick leave reminders to send.');
      return;
    }

    for (const req of list.results) {
      console.log(`Sending sick leave reminder for request ID ${req.id}`);
      
      const subject = `[Reminder] Upload Medical Prescription - Sick Leave`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <div style="background-color: #0f172a; padding: 32px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Corvus Studio</h2>
              <p style="margin: 4px 0 0 0; color: #f43f5e; font-size: 14px; font-weight: 600;">Prescription Upload Required</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hello ${req.full_name},</p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                This is a reminder regarding the Sick Leave request you applied for. According to Studio guidelines, please upload your doctor prescription / medical certificate.
              </p>
              
              <!-- Detail Card -->
              <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; width: 35%;">Leave Type</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${req.leave_type}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Duration</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${req.from_date} to ${req.to_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Total Days</td>
                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${req.leave_count} Day${req.leave_count > 1 ? 's' : ''}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                Please either <strong>upload it within the leave management tool</strong> from your dashboard, or <strong>send it directly to your manager</strong>.
              </p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://leave.thecorvusstudio.com" style="background-color: #f43f5e; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 6px -1px rgba(244, 63, 94, 0.2);">
                  Upload within Leave Tool
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
              This is an automated notification from the Corvus Studio Leave Portal.<br>
              © 2026 Corvus Studio. All rights reserved.
            </div>
          </div>
        </div>
      `;

      await sendNotificationEmail(env.RESEND_API_KEY, {
        to: req.work_email,
        subject,
        html
      });

      // Log this send event in audit logs to ensure we don't duplicate
      await env.DB.prepare(`
        INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at)
        VALUES ('SICK_LEAVE_REMINDER_SENT', NULL, ?, ?, CURRENT_TIMESTAMP)
      `).bind(req.employee_id, String(req.id)).run();
    }

    // 2. Holiday Reminders (Tomorrow)
    const holidaysTomorrow = await env.DB.prepare(`
      SELECT h.id, h.name, h.holiday_date 
      FROM holidays h
      WHERE h.holiday_date = date('now', '+1 day')
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs al 
          WHERE al.action = 'HOLIDAY_REMINDER_SENT' 
            AND al.details = CAST(h.id AS TEXT)
        )
    `).all();

    if (holidaysTomorrow && holidaysTomorrow.results && holidaysTomorrow.results.length > 0) {
      const activeUsers = await env.DB.prepare(`SELECT work_email FROM users WHERE status = 'active'`).all();
      if (activeUsers && activeUsers.results && activeUsers.results.length > 0) {
        for (const holiday of holidaysTomorrow.results) {
          console.log(`Sending holiday broadcast for ${holiday.name}`);
          await sendHolidayBroadcastEmail(env, null, activeUsers.results, holiday.name, holiday.holiday_date);
          await env.DB.prepare(`
            INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) 
            VALUES ('HOLIDAY_REMINDER_SENT', NULL, NULL, ?, CURRENT_TIMESTAMP)
          `).bind(String(holiday.id)).run();
        }
      }
    }

    // 3. Casual Leave Starting Reminders (Tomorrow)
    const casualLeavesTomorrow = await env.DB.prepare(`
      SELECT lr.id, lr.leave_type, lr.from_date, lr.to_date, lr.reason, u.id as employee_id, u.full_name, u.work_email, u.department
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      WHERE lr.leave_type = 'Casual Leave'
        AND lr.status = 'approved'
        AND lr.from_date = date('now', '+1 day')
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs al 
          WHERE al.action = 'LEAVE_START_REMINDER_SENT' 
            AND al.details = CAST(lr.id AS TEXT)
        )
    `).all();

    if (casualLeavesTomorrow && casualLeavesTomorrow.results && casualLeavesTomorrow.results.length > 0) {
      for (const req of casualLeavesTomorrow.results) {
        console.log(`Sending casual leave start reminder for request ID ${req.id}`);
        await sendLeaveStartingReminderEmail(env, null, req);
        await env.DB.prepare(`
          INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) 
          VALUES ('LEAVE_START_REMINDER_SENT', NULL, ?, ?, CURRENT_TIMESTAMP)
        `).bind(req.employee_id, String(req.id)).run();
      }
    }

    // 4. Birthday Reminders (Automated Scheduled Emails)
    // The cron will run at 18:30 UTC which is exactly 12:00 AM IST.
    
    // Get current date in IST
    const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const istMonth = String(istDate.getMonth() + 1).padStart(2, '0');
    const istDay = String(istDate.getDate()).padStart(2, '0');
    const istMonthDay = `-${istMonth}-${istDay}`; // e.g. '-06-30'

    // Get templates
    const templates = await env.DB.prepare(`SELECT id, subject, html_body FROM email_templates`).all();
    const wishTpl = templates.results.find(t => t.id === 'birthday_wish');
    const notifTpl = templates.results.find(t => t.id === 'birthday_notification');
    const allActiveUsers = await env.DB.prepare(`SELECT id, work_email FROM users WHERE status = 'active'`).all();

    // Part A: Send Birthday Wish to Birthday Person Today at 12 AM
    const birthdayUsersToday = await env.DB.prepare(`
      SELECT id, full_name, work_email
      FROM users 
      WHERE status = 'active' AND dob LIKE ?
    `).bind(`%${istMonthDay}`).all();

    if (birthdayUsersToday && birthdayUsersToday.results && birthdayUsersToday.results.length > 0) {
      for (const emp of birthdayUsersToday.results) {
        if (!emp.work_email) continue;

        const alreadySent = await env.DB.prepare(`
          SELECT 1 FROM audit_logs WHERE action = 'BIRTHDAY_WISH_SENT' AND target_user_id = ? AND date(created_at) = date('now')
        `).bind(emp.id).first();

        if (!alreadySent) {
          console.log(`Sending birthday wish to user ID ${emp.id}`);
          let wishHtml = wishTpl ? wishTpl.html_body : 'Happy Birthday!';
          wishHtml = wishHtml.replaceAll('{{name}}', emp.full_name);
          let wishSubject = wishTpl ? wishTpl.subject : 'Happy Birthday!';
          wishSubject = wishSubject.replaceAll('{{name}}', emp.full_name);

          await sendNotificationEmail(env.RESEND_API_KEY, {
            to: emp.work_email,
            subject: wishSubject,
            html: wishHtml
          });

          await env.DB.prepare(`
            INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) 
            VALUES ('BIRTHDAY_WISH_SENT', NULL, ?, 'Sent birthday wish email', CURRENT_TIMESTAMP)
          `).bind(emp.id).run();
        }
      }
    }

    // Part B: Send Day-Before Birthday Notification to Colleagues
    const tomorrowDate = new Date(istDate.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowMonth = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
    const tomorrowDay = String(tomorrowDate.getDate()).padStart(2, '0');
    const tomorrowMonthDay = `-${tomorrowMonth}-${tomorrowDay}`;

    const birthdayUsersTomorrow = await env.DB.prepare(`
      SELECT id, full_name, work_email
      FROM users 
      WHERE status = 'active' AND dob LIKE ?
    `).bind(`%${tomorrowMonthDay}`).all();

    if (birthdayUsersTomorrow && birthdayUsersTomorrow.results && birthdayUsersTomorrow.results.length > 0) {
      for (const emp of birthdayUsersTomorrow.results) {
        const alreadyNotified = await env.DB.prepare(`
          SELECT 1 FROM audit_logs WHERE action = 'BIRTHDAY_NOTIFICATION_SENT' AND target_user_id = ? AND date(created_at) = date('now')
        `).bind(emp.id).first();

        if (!alreadyNotified) {
          console.log(`Sending day-before birthday notification for user ID ${emp.id} to colleagues`);
          let notifHtml = notifTpl ? notifTpl.html_body : 'Tomorrow is {{name}}\'s birthday!';
          notifHtml = notifHtml.replaceAll('{{name}}', emp.full_name);
          let notifSubject = notifTpl ? notifTpl.subject : 'Birthday Tomorrow!';
          notifSubject = notifSubject.replaceAll('{{name}}', emp.full_name);

          for (const colleague of allActiveUsers.results) {
            if (colleague.id === emp.id || !colleague.work_email) continue;

            await sendNotificationEmail(env.RESEND_API_KEY, {
              to: colleague.work_email,
              subject: notifSubject,
              html: notifHtml
            });
          }

          await env.DB.prepare(`
            INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) 
            VALUES ('BIRTHDAY_NOTIFICATION_SENT', NULL, ?, 'Notified colleagues about birthday one day before', CURRENT_TIMESTAMP)
          `).bind(emp.id).run();
        }
      }
    }

  } catch (err) {
    console.error('Error handling scheduled reminders:', err);
  }
}

async function calculateWorkingDays(db, fromDateStr, toDateStr) {
  const start = new Date(fromDateStr);
  const end = new Date(toDateStr);
  if (start > end) return 0;

  // Fetch all holidays falling within the date range from D1
  const holidaysResult = await db.prepare(
    `SELECT holiday_date FROM holidays WHERE holiday_date BETWEEN ? AND ?`
  ).bind(fromDateStr, toDateStr).all();

  const holidayDates = new Set(holidaysResult.results.map(h => h.holiday_date));
  let count = 0;
  let current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    if (dayOfWeek === 0) {
      // Sunday: does NOT count
    } else if (dayOfWeek === 6) {
      // Saturday: counts as half day (0.5), holidays on Saturday are skipped
      if (!holidayDates.has(dateStr)) {
        count += 0.5;
      }
    } else {
      // Mon–Fri: full day, exclude public holidays
      if (!holidayDates.has(dateStr)) {
        count++;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({ status: 'success', message: 'Corvus Leave API worker is running.' });
});

app.on('GET', ['/api/health', '/health'], async (c) => {
  // Do not expose internal counts to unauthenticated callers
  return c.json({ status: 'success', message: 'Corvus Leave API is healthy.' });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.on('POST', ['/api/v1/auth/request-otp', '/auth/request-otp'], async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip, 'request-otp', 5, 60 * 1000)) {
    return c.json({ status: 'fail', message: 'Too many OTP requests. Please wait a minute before trying again.' }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();

  if (!email) {
    return c.json({ status: 'fail', message: 'Email is required.' }, 400);
  }

  const user = await c.env.DB.prepare(
    `SELECT id, full_name, work_email, role FROM users WHERE work_email = ? LIMIT 1`
  ).bind(email).first();

  if (!user) {
    return c.json({ status: 'fail', message: 'Employee not found.' }, 404);
  }

  const otp = generateOtp();
  const otpHash = await hashValue(otp); // Store hash, not plaintext
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO otp_codes (email, otp_hash, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(email) DO UPDATE SET
       otp_hash = excluded.otp_hash,
       expires_at = excluded.expires_at,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(email, otpHash, expiresAt).run();

  await sendOtpEmail(c.env.RESEND_API_KEY, email, otp); // Send plain OTP, store hash

  return c.json({ status: 'success', message: 'OTP sent successfully to your work email.' });
});

app.on('POST', ['/api/v1/auth/verify-otp', '/auth/verify-otp'], async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip, 'verify-otp', 5, 60 * 1000)) {
    return c.json({ status: 'fail', message: 'Too many OTP verification attempts. Please wait a minute.' }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();
  const otp = String(body.otp || '').replace(/\s+/g, '').trim();

  if (!email || !otp) {
    return c.json({ status: 'fail', message: 'Email and otp are required.' }, 400);
  }

  const otpRecord = await c.env.DB.prepare(
    `SELECT * FROM otp_codes WHERE email = ? LIMIT 1`
  ).bind(email).first();

  if (!otpRecord) {
    return c.json({ status: 'fail', message: 'OTP has expired or is invalid.' }, 400);
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    await c.env.DB.prepare(`DELETE FROM otp_codes WHERE email = ?`).bind(email).run();
    return c.json({ status: 'fail', message: 'OTP has expired or is invalid.' }, 400);
  }

  const enteredOtp = String(body.otp || '').replace(/\s+/g, '').trim();
  const enteredOtpHash = await hashValue(enteredOtp); // Hash before comparing
  const storedOtpHash = String(otpRecord.otp_hash || '').trim();

  if (enteredOtpHash !== storedOtpHash) {
    return c.json({ status: 'fail', message: 'Invalid OTP code provided.' }, 400);
  }

  await c.env.DB.prepare(`DELETE FROM otp_codes WHERE email = ?`).bind(email).run();

  const user = await c.env.DB.prepare(
    `SELECT id, full_name, work_email, role, designation, department, employee_type, joining_date, dob,
            can_approve_leaves, can_add_employee, can_remove_employee
     FROM users WHERE work_email = ? LIMIT 1`
  ).bind(email).first();

  if (!user) {
    return c.json({ status: 'fail', message: 'Employee not found.' }, 404);
  }

  const accessToken = await signAccessToken(
    { userId: user.id, role: user.role, email: user.work_email },
    c.env.JWT_SECRET
  );

  const refreshToken = await signRefreshToken(
    { userId: user.id },
    c.env.JWT_REFRESH_SECRET
  );

  // Set the refresh token in an HttpOnly, Secure, SameSite=None cookie for security (cross-origin cookie access)
  c.header('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${7 * 24 * 60 * 60}`);

  return c.json({
    status: 'success',
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      workEmail: user.work_email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      employeeType: user.employee_type,
      joiningDate: user.joining_date,
      dob: user.dob,
      canApproveLeaves: user.can_approve_leaves === 1,
      canAddEmployee: user.can_add_employee === 1,
      canRemoveEmployee: user.can_remove_employee === 1
    },
  });
});

app.on('POST', ['/api/v1/auth/refresh-token', '/auth/refresh-token'], async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip, 'refresh-token', 10, 60 * 1000)) {
    return c.json({ status: 'fail', message: 'Too many refresh token requests. Please wait a minute.' }, 429);
  }

  const cookieHeader = c.req.header('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(x => {
      const parts = x.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  
  const refreshToken = cookies['refreshToken'];

  if (!refreshToken) {
    return c.json({ status: 'fail', message: 'Refresh token is missing.' }, 401);
  }

  try {
    const payload = await verifyToken(refreshToken, c.env.JWT_REFRESH_SECRET);
    const userId = payload.userId;

    const user = await c.env.DB.prepare(
      `SELECT id, full_name, work_email, role FROM users WHERE id = ? AND status = 'active' LIMIT 1`
    ).bind(userId).first();

    if (!user) {
      return c.json({ status: 'fail', message: 'User not found or inactive.' }, 401);
    }

    const accessToken = await signAccessToken(
      { userId: user.id, role: user.role, email: user.work_email },
      c.env.JWT_SECRET
    );

    return c.json({
      status: 'success',
      accessToken
    });
  } catch (error) {
    return c.json({ status: 'fail', message: 'Invalid or expired refresh token.' }, 401);
  }
});

app.on('POST', ['/api/v1/auth/logout', '/auth/logout'], auth, async (c) => {
  // Clear the HttpOnly refresh token cookie on logout
  c.header('Set-Cookie', `refreshToken=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`);
  return c.json({
    status: 'success',
    message: 'Logged out successfully.'
  });
});

app.on('GET', ['/api/v1/auth/me', '/auth/me'], auth, async (c) => {
  const jwtUser = c.get('user');
  const user = await c.env.DB.prepare(
    `SELECT id, full_name, work_email, role, designation, department, employee_type, joining_date, dob, contact_number,
            can_approve_leaves, can_add_employee, can_remove_employee
     FROM users WHERE id = ? LIMIT 1`
  ).bind(jwtUser.userId).first();

  if (!user) return c.json({ status: 'fail', message: 'User not found.' }, 404);

  return c.json({
    status: 'success',
    user: {
      id: user.id,
      fullName: user.full_name,
      workEmail: user.work_email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      employeeType: user.employee_type,
      joiningDate: user.joining_date,
      dob: user.dob,
      contactNumber: user.contact_number,
      canApproveLeaves: user.can_approve_leaves === 1,
      canAddEmployee: user.can_add_employee === 1,
      canRemoveEmployee: user.can_remove_employee === 1
    },
  });
});

// ─── User Routes ─────────────────────────────────────────────────────────────

app.on('GET', ['/api/v1/user/profile', '/user/profile'], auth, async (c) => {
  const jwtUser = c.get('user');
  const user = await c.env.DB.prepare(
    `SELECT id, full_name, work_email, role, designation, department, employee_type, joining_date, dob, contact_number, profile_image,
            can_approve_leaves, can_manage_documents, can_manage_roles
     FROM users WHERE id = ? LIMIT 1`
  ).bind(jwtUser.userId).first();

  if (!user) return c.json({ status: 'fail', message: 'User not found.' }, 404);

  return c.json({
    status: 'success',
    data: {
      id: user.id,
      fullName: user.full_name,
      workEmail: user.work_email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      employeeType: user.employee_type,
      joiningDate: user.joining_date,
      dob: user.dob,
      contactNumber: user.contact_number,
      profileImage: user.profile_image,
      canApproveLeaves: user.can_approve_leaves === 1,
      canManageDocuments: user.can_manage_documents === 1,
      canManageRoles: user.can_manage_roles === 1,
    },
  });
});

app.on('PATCH', ['/api/v1/user/profile', '/user/profile'], auth, async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { contactNumber, personalEmail } = body;

  await c.env.DB.prepare(
    `UPDATE users SET contact_number = COALESCE(?, contact_number),
     personal_email = COALESCE(?, personal_email) WHERE id = ?`
  ).bind(contactNumber || null, personalEmail || null, jwtUser.userId).run();

  return c.json({ status: 'success', message: 'Profile updated successfully.' });
});

app.on('GET', ['/api/v1/user/list', '/user/list'], auth, async (c) => {
  const usersResult = await c.env.DB.prepare(
    `SELECT id, full_name, work_email, personal_email, role, status, designation, department, employee_type, joining_date, dob, contact_number,
            can_approve_leaves, can_manage_documents, can_manage_roles
     FROM users WHERE status = 'active' ORDER BY full_name ASC`
  ).all();

  // Fetch all leave balances with leave type names in a single query
  const balancesResult = await c.env.DB.prepare(
    `SELECT lb.user_id, lt.name as leave_type_name, lb.balance, lb.used
     FROM leave_balances lb
     JOIN leave_types lt ON lb.leave_type_id = lt.id`
  ).all();

  // Group balances by user_id
  const balancesByUser = {};
  for (const b of balancesResult.results) {
    if (!balancesByUser[b.user_id]) balancesByUser[b.user_id] = [];
    balancesByUser[b.user_id].push({
      leaveTypeName: b.leave_type_name,
      balance: parseFloat(b.balance),
      used: parseFloat(b.used),
    });
  }

  return c.json({
    status: 'success',
    data: usersResult.results.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      workEmail: u.work_email,
      personalEmail: u.personal_email,
      role: u.role,
      status: u.status,
      designation: u.designation,
      department: u.department,
      employeeType: u.employee_type,
      joiningDate: u.joining_date,
      dob: u.dob,
      contactNumber: u.contact_number,
      canApproveLeaves: u.can_approve_leaves === 1,
      canManageDocuments: u.can_manage_documents === 1,
      canManageRoles: u.can_manage_roles === 1,
      leaveBalances: balancesByUser[u.id] || [],
    })),
  });
});

app.on('GET', ['/api/v1/admin/employees/ex', '/admin/employees/ex'], auth, async (c) => {
  const usersResult = await c.env.DB.prepare(
    `SELECT id, full_name, work_email, role, status, designation, department, employee_type, joining_date, dob, contact_number, personal_email, leaving_date, leaving_reason
     FROM users WHERE status = 'inactive' ORDER BY leaving_date DESC, full_name ASC`
  ).all();

  return c.json({
    status: 'success',
    data: usersResult.results.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      workEmail: u.work_email,
      role: u.role,
      status: u.status,
      designation: u.designation,
      department: u.department,
      employeeType: u.employee_type,
      joiningDate: u.joining_date,
      dob: u.dob,
      contactNumber: u.contact_number,
      personalEmail: u.personal_email,
      leavingDate: u.leaving_date,
      leavingReason: u.leaving_reason
    }))
  });
});

// ─── Holiday Routes ──────────────────────────────────────────────────────────

app.on('GET', ['/api/v1/holiday/upcoming', '/holiday/upcoming'], auth, async (c) => {
  const limit = parseInt(c.req.query('limit')) || 4;
  const today = new Date().toISOString().split('T')[0];

  const result = await c.env.DB.prepare(
    `SELECT h.id, h.holiday_date, h.name, hr.type, hr.fixed_month, hr.fixed_day, hr.seeded_date_2026
     FROM holidays h
     LEFT JOIN holiday_rules hr ON h.rule_id = hr.id
     WHERE h.holiday_date >= ?
     ORDER BY h.holiday_date ASC
     LIMIT ?`
  ).bind(today, limit).all();

  return c.json({
    status: 'success',
    data: result.results.map(h => ({
      id: h.id,
      holidayDate: h.holiday_date,
      name: h.name,
      rule: {
        type: h.type,
        fixedMonth: h.fixed_month,
        fixedDay: h.fixed_day,
        seededDate2026: h.seeded_date_2026
      }
    }))
  });
});

app.on('GET', ['/api/v1/holiday', '/holiday'], auth, async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT h.id, h.holiday_date, h.name, hr.type, hr.fixed_month, hr.fixed_day, hr.seeded_date_2026
     FROM holidays h
     LEFT JOIN holiday_rules hr ON h.rule_id = hr.id
     ORDER BY h.holiday_date ASC`
  ).all();

  return c.json({
    status: 'success',
    data: result.results.map(h => ({
      id: h.id,
      holidayDate: h.holiday_date,
      name: h.name,
      rule: {
        type: h.type,
        fixedMonth: h.fixed_month,
        fixedDay: h.fixed_day,
        seededDate2026: h.seeded_date_2026
      }
    }))
  });
});

// ─── Leave Routes ─────────────────────────────────────────────────────────────

app.on('GET', ['/api/v1/leave/balances', '/leave/balances'], auth, async (c) => {
  const jwtUser = c.get('user');
  const result = await c.env.DB.prepare(
    `SELECT lb.id, lb.user_id, lb.leave_type_id, lb.balance, lb.used, lt.name as leave_type_name, lt.default_quota
     FROM leave_balances lb
     JOIN leave_types lt ON lb.leave_type_id = lt.id
     WHERE lb.user_id = ?`
  ).bind(jwtUser.userId).all();

  return c.json({
    status: 'success',
    data: result.results.map((b) => ({
      id: b.id,
      userId: b.user_id,
      leaveTypeId: mapDbToFrontendLeaveTypeId(b.leave_type_id),
      balance: b.balance,
      used: b.used,
      leaveType: { name: b.leave_type_name, defaultQuota: b.default_quota },
    })),
  });
});

app.on('GET', ['/api/v1/leave/personal-requests', '/leave/personal-requests'], auth, async (c) => {
  const jwtUser = c.get('user');
  const result = await c.env.DB.prepare(
    `SELECT lr.*, u.full_name
     FROM leave_requests lr
     JOIN users u ON lr.employee_id = u.id
     WHERE lr.employee_id = ?
     ORDER BY lr.created_at DESC`
  ).bind(jwtUser.userId).all();

  const leaveTypes = await c.env.DB.prepare(`SELECT * FROM leave_types`).all();
  const ltMap = {};
  for (const lt of leaveTypes.results) {
    ltMap[lt.name] = lt.id;
  }

  return c.json({
    status: 'success',
    data: result.results.map((r) => ({
      id: r.id,
      userId: r.employee_id,
      leaveTypeId: mapDbToFrontendLeaveTypeId(ltMap[r.leave_type] || null),
      fromDate: r.from_date,
      toDate: r.to_date,
      isHalfDay: false,
      leaveCount: r.leave_count,
      reason: r.reason,
      status: r.status,
      managerComment: r.manager_comment,
      medicalDocumentPath: r.medical_document_path,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      leaveType: {
        name: r.leave_type
      },
      user: {
        fullName: r.full_name
      }
    })),
  });
});

app.on('POST', ['/api/v1/leave/apply', '/leave/apply'], auth, async (c) => {
  const jwtUser = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const { leaveType, leaveTypeId, fromDate, toDate, reason, medicalDocumentPath } = body;

  if ((!leaveType && !leaveTypeId) || !fromDate || !toDate) {
    return c.json({ status: 'fail', message: 'leaveType/leaveTypeId, fromDate, and toDate are required.' }, 400);
  }

  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
    return c.json({ status: 'fail', message: 'Invalid date format. Use YYYY-MM-DD.' }, 400);
  }

  // Validate reason length
  if (reason && reason.length > 500) {
    return c.json({ status: 'fail', message: 'Reason must be 500 characters or less.' }, 400);
  }

  const workingDays = await calculateWorkingDays(c.env.DB, fromDate, toDate);
  if (workingDays === 0) {
    return c.json({ status: 'fail', message: 'Selected date range contains no working days (weekends or holidays only).' }, 400);
  }

  // Look up leave type
  let ltRecord;
  if (leaveTypeId) {
    const dbLeaveTypeId = mapFrontendToDbLeaveTypeId(leaveTypeId);
    ltRecord = await c.env.DB.prepare(
      `SELECT * FROM leave_types WHERE id = ? OR name = ? LIMIT 1`
    ).bind(dbLeaveTypeId, dbLeaveTypeId).first();
  } else {
    ltRecord = await c.env.DB.prepare(
      `SELECT * FROM leave_types WHERE name = ? LIMIT 1`
    ).bind(leaveType).first();
  }

  if (!ltRecord) {
    return c.json({ status: 'fail', message: 'Selected leave type does not exist.' }, 404);
  }

  // Get user balance
  const balanceRecord = await c.env.DB.prepare(
    `SELECT * FROM leave_balances WHERE user_id = ? AND leave_type_id = ? LIMIT 1`
  ).bind(jwtUser.userId, ltRecord.id).first();

  if (!balanceRecord) {
    return c.json({ status: 'fail', message: 'Leave balance record not found for this user.' }, 404);
  }

  // Fetch pending leaves count
  const pendingRequests = await c.env.DB.prepare(
    `SELECT SUM(leave_count) as total_pending FROM leave_requests
     WHERE employee_id = ? AND leave_type = ? AND status IN ('pending', 'pending_medical')`
  ).bind(jwtUser.userId, ltRecord.name).first();

  const pendingCount = parseFloat(pendingRequests.total_pending || 0);
  const availableBalance = parseFloat(balanceRecord.balance) - pendingCount;

  if (workingDays > availableBalance) {
    return c.json({
      status: 'fail',
      message: `Insufficient leave balance. Requested: ${workingDays}, Available (excluding pending requests): ${availableBalance}`
    }, 400);
  }

  // Sick Leave Compliance Rule: Request starts as pending even if prescription is missing.
  // Employee must upload it within a 5-day grace window.
  let status = 'pending';

  await c.env.DB.prepare(
    `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, leave_count, reason, status, medical_document_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(jwtUser.userId, ltRecord.name, fromDate, toDate, workingDays, reason || '', status, medicalDocumentPath || null).run();

  const applicant = await c.env.DB.prepare(
    `SELECT full_name, work_email, department FROM users WHERE id = ? LIMIT 1`
  ).bind(jwtUser.userId).first();

  if (applicant) {
    c.executionCtx.waitUntil(
      sendLeaveAppliedEmail(
        c.env,
        c.executionCtx,
        applicant.full_name,
        applicant.work_email,
        applicant.department,
        ltRecord.name,
        fromDate,
        toDate,
        workingDays,
        reason || ''
      )
    );
  }

  return c.json({ status: 'success', message: 'Leave request submitted successfully.' });
});

app.on('GET', ['/api/v1/leave/team-requests', '/leave/team-requests'], auth, async (c) => {
  const jwtUser = c.get('user');
  const dbUser  = await c.env.DB.prepare(
    `SELECT id, role, department, work_email FROM users WHERE id = ? LIMIT 1`
  ).bind(jwtUser.userId).first();

  let query, params = [];

  if (dbUser.role === 'manager' && dbUser.work_email !== 'nihar@thecorvusstudio.com') {
    query  = `SELECT lr.*, u.full_name, u.department, u.designation, u.work_email, u.profile_image
              FROM leave_requests lr JOIN users u ON lr.employee_id = u.id
              WHERE u.department = ?
              ORDER BY lr.created_at DESC`;
    params = [dbUser.department];
  } else {
    query = `SELECT lr.*, u.full_name, u.department, u.designation, u.work_email, u.profile_image
             FROM leave_requests lr JOIN users u ON lr.employee_id = u.id
             ORDER BY lr.created_at DESC`;
  }

  const result = await c.env.DB.prepare(query).bind(...params).all();

  const leaveTypes = await c.env.DB.prepare(`SELECT * FROM leave_types`).all();
  const ltMap = {};
  for (const lt of leaveTypes.results) {
    ltMap[lt.name] = lt.id;
  }

  return c.json({
    status: 'success',
    data: result.results.map((r) => ({
      id: r.id,
      userId: r.employee_id,
      leaveTypeId: mapDbToFrontendLeaveTypeId(ltMap[r.leave_type] || null),
      fromDate: r.from_date,
      toDate: r.to_date,
      leaveCount: r.leave_count,
      reason: r.reason,
      status: r.status,
      managerComment: r.manager_comment,
      medicalDocumentPath: r.medical_document_path,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      leaveType: {
        name: r.leave_type
      },
      user: {
        fullName: r.full_name,
        department: r.department,
        designation: r.designation,
        profileImage: r.profile_image
      }
    }))
  });
});

app.on('PATCH', ['/api/v1/leave/:id/status', '/leave/:id/status'], auth, requireRole('admin', 'senior_manager'), async (c) => {
  const jwtUser = c.get('user');
  const id      = c.req.param('id');
  const body    = await c.req.json().catch(() => ({}));
  const { status, managerComment } = body;

  const caller = await c.env.DB.prepare(`SELECT work_email, can_approve_leaves FROM users WHERE id = ? LIMIT 1`).bind(jwtUser.userId).first();
  if (!caller) return c.json({ status: 'fail', message: 'User not found.' }, 404);

  const isRaj = caller.work_email === 'raj@thecorvusstudio.com';
  if (!isRaj && !caller.can_approve_leaves) {
    return c.json({ status: 'fail', message: 'You do not have permission to approve leaves.' }, 403);
  }

  if (!['approved', 'rejected'].includes(status)) {
    return c.json({ status: 'fail', message: 'Status must be approved or rejected.' }, 400);
  }

  const request = await c.env.DB.prepare(
    `SELECT * FROM leave_requests WHERE id = ? LIMIT 1`
  ).bind(id).first();

  if (!request) {
    return c.json({ status: 'fail', message: 'Leave request not found.' }, 404);
  }

  if (request.status === 'approved' || request.status === 'rejected') {
    return c.json({ status: 'fail', message: 'This leave request has already been finalized.' }, 400);
  }

  if (request.status === 'pending_medical') {
    return c.json({ status: 'fail', message: 'Cannot approve/reject a request pending medical document. User must upload document first.' }, 400);
  }

  if (status === 'approved') {
    const ltRecord = await c.env.DB.prepare(
      `SELECT id FROM leave_types WHERE name = ? LIMIT 1`
    ).bind(request.leave_type).first();

    if (!ltRecord) {
      return c.json({ status: 'fail', message: 'Leave type not found for this request.' }, 404);
    }

    const balanceRecord = await c.env.DB.prepare(
      `SELECT balance, used FROM leave_balances WHERE user_id = ? AND leave_type_id = ? LIMIT 1`
    ).bind(request.employee_id, ltRecord.id).first();

    if (!balanceRecord) {
      return c.json({ status: 'fail', message: 'Leave balance record not found.' }, 404);
    }

    if (parseFloat(balanceRecord.balance) < parseFloat(request.leave_count)) {
      return c.json({ status: 'fail', message: 'Employee does not have sufficient leave balance to finalize approval.' }, 400);
    }

    const newBalance = parseFloat(balanceRecord.balance) - parseFloat(request.leave_count);
    const newUsed = parseFloat(balanceRecord.used) + parseFloat(request.leave_count);

    await c.env.DB.prepare(
      `UPDATE leave_balances SET balance = ?, used = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND leave_type_id = ?`
    ).bind(newBalance, newUsed, request.employee_id, ltRecord.id).run();
  }

  await c.env.DB.prepare(
    `UPDATE leave_requests SET status = ?, manager_comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(status, managerComment || '', id).run();

  await c.env.DB.prepare(
    `INSERT INTO audit_logs (action, performed_by, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(`LEAVE_${status.toUpperCase()}`, jwtUser.userId, `Leave request #${id}`).run();

  const applicant = await c.env.DB.prepare(
    `SELECT full_name, work_email FROM users WHERE id = ? LIMIT 1`
  ).bind(request.employee_id).first();

  if (applicant) {
    c.executionCtx.waitUntil(
      sendLeaveStatusChangedEmail(
        c.env,
        c.executionCtx,
        applicant.full_name,
        applicant.work_email,
        request.leave_type,
        request.from_date,
        request.to_date,
        request.leave_count,
        request.reason,
        status,
        managerComment || ''
      )
    );
  }

  return c.json({ status: 'success', message: `Leave request ${status} successfully.` });
});

app.on('PATCH', ['/api/v1/leave/:id/medical-document', '/leave/:id/medical-document'], auth, async (c) => {
  const jwtUser = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { medicalDocumentPath } = body;

  if (!medicalDocumentPath) {
    return c.json({ status: 'fail', message: 'Medical document path / URL is required.' }, 400);
  }

  // Validate file format: only PDF, JPG, JPEG, PNG are accepted
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const urlLower = medicalDocumentPath.toLowerCase().split('?')[0]; // strip query params
  const hasValidExtension = allowedExtensions.some(ext => urlLower.endsWith(ext));
  if (!hasValidExtension) {
    return c.json({ status: 'fail', message: 'Invalid file format. Only PDF, JPG, and PNG files are accepted for medical documents.' }, 400);
  }

  // Validate that the URL points to an approved domain if it is a full URL
  if (medicalDocumentPath.startsWith('http://') || medicalDocumentPath.startsWith('https://')) {
    try {
      const parsedUrl = new URL(medicalDocumentPath);
      const hostname = parsedUrl.hostname.toLowerCase();
      const allowedDomains = [
        'thecorvusstudio.com',
        'google.com',
        'google.co.in',
        'drive.google.com',
        'docs.google.com',
        'dropbox.com',
        'r2.dev'
      ];
      const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
      if (!isAllowed) {
        return c.json({ status: 'fail', message: 'Document URL must be from an approved source (e.g. Google Drive, Dropbox, or the studio domain).' }, 400);
      }
    } catch (e) {
      return c.json({ status: 'fail', message: 'Invalid document URL format.' }, 400);
    }
  }

  const request = await c.env.DB.prepare(
    `SELECT * FROM leave_requests WHERE id = ? LIMIT 1`
  ).bind(id).first();

  if (!request) {
    return c.json({ status: 'fail', message: 'Leave request not found.' }, 404);
  }

  if (request.employee_id !== jwtUser.userId) {
    return c.json({ status: 'fail', message: 'You do not have permission to update this leave request.' }, 403);
  }

  const requestDate = new Date(request.created_at);
  const diffTime = Date.now() - requestDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays > 5) {
    return c.json({ status: 'fail', message: 'The 5-day grace period to upload a prescription has expired.' }, 400);
  }

  const newStatus = request.status === 'pending_medical' ? 'pending' : request.status;

  await c.env.DB.prepare(
    `UPDATE leave_requests SET medical_document_path = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(medicalDocumentPath, newStatus, id).run();

  await c.env.DB.prepare(
    `INSERT INTO audit_logs (action, performed_by, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind('LEAVE_DOCUMENT_UPLOADED', jwtUser.userId, `Uploaded medical document for leave request ID ${id}. Path: ${medicalDocumentPath}`).run();

  const applicant = await c.env.DB.prepare(
    `SELECT full_name, work_email FROM users WHERE id = ? LIMIT 1`
  ).bind(request.employee_id).first();

  if (applicant) {
    c.executionCtx.waitUntil(
      sendPrescriptionUploadedEmail(
        c.env,
        applicant.full_name,
        applicant.work_email,
        request.leave_type,
        request.from_date,
        request.to_date,
        request.leave_count,
        medicalDocumentPath
      )
    );
  }

  return c.json({ status: 'success', message: 'Medical document updated successfully.' });
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

app.on('GET', ['/api/v1/admin/audit-logs', '/admin/audit-logs'], auth, requireRole('admin', 'senior_manager'), async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT al.*, u.full_name as user_full_name, u.work_email as user_work_email
     FROM audit_logs al
     LEFT JOIN users u ON al.performed_by = u.id
     ORDER BY al.created_at DESC
     LIMIT 100`
  ).all();

  return c.json({
    status: 'success',
    data: result.results.map(r => ({
      id: r.id,
      action: r.action,
      details: r.details,
      createdAt: r.created_at,
      user: r.performed_by ? {
        fullName: r.user_full_name,
        workEmail: r.user_work_email
      } : null
    }))
  });
});

app.on('POST', ['/api/v1/admin/employee', '/admin/employee'], auth, requireRole('admin'), async (c) => {
  const jwtUser = c.get('user');
  const body    = await c.req.json().catch(() => ({}));
  const { fullName, workEmail, role, designation, department, employeeType, joiningDate, contactNumber, personalEmail } = body;

  const caller = await c.env.DB.prepare(`SELECT work_email, can_add_employee FROM users WHERE id = ? LIMIT 1`).bind(jwtUser.userId).first();
  if (!caller) return c.json({ status: 'fail', message: 'User not found.' }, 404);

  const isRaj = caller.work_email === 'raj@thecorvusstudio.com';
  if (!isRaj && !caller.can_add_employee) {
    return c.json({ status: 'fail', message: 'You do not have permission to add employees.' }, 403);
  }

  if (!fullName || !workEmail || !role) {
    return c.json({ status: 'fail', message: 'fullName, workEmail, and role are required.' }, 400);
  }

  const normalizedEmail = workEmail.toLowerCase().trim();
  if (!normalizedEmail.endsWith('@thecorvusstudio.com')) {
    return c.json({ status: 'fail', message: 'Access restricted to @thecorvusstudio.com domains.' }, 400);
  }

  const existing = await c.env.DB.prepare(
    `SELECT id FROM users WHERE work_email = ? LIMIT 1`
  ).bind(normalizedEmail).first();

  if (existing) {
    return c.json({ status: 'fail', message: 'An employee with this work email already exists.' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO users (full_name, work_email, role, status, designation, department, employee_type, joining_date, contact_number, personal_email)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
  ).bind(fullName, normalizedEmail, role, designation || null, department || null,
         employeeType || 'Full Time', joiningDate || null, contactNumber || null, personalEmail || null).run();

  const newUserId = result.meta.last_row_id;
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO leave_balances (user_id, leave_type_id, balance, used)
     SELECT ?, lt.id, lt.default_quota, 0 FROM leave_types lt`
  ).bind(newUserId).run();

  await c.env.DB.prepare(
    `INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind('EMPLOYEE_CREATED', jwtUser.userId, newUserId, `Created: ${fullName} (${workEmail})`).run();

  // Send welcome email — fire and forget, non-blocking
  if (c.env.RESEND_API_KEY) {
    c.executionCtx?.waitUntil(
      sendWelcomeEmail(c.env.RESEND_API_KEY, normalizedEmail, fullName)
    );
  }

  return c.json({ status: 'success', message: 'Employee created successfully.', data: { id: newUserId } });
});

app.on('DELETE', ['/api/v1/admin/employee/:id', '/admin/employee/:id'], auth, requireRole('admin'), async (c) => {
  const jwtUser = c.get('user');
  const id = parseInt(c.req.param('id'), 10);

  const caller = await c.env.DB.prepare(`SELECT work_email, can_remove_employee FROM users WHERE id = ? LIMIT 1`).bind(jwtUser.userId).first();
  if (!caller) return c.json({ status: 'fail', message: 'User not found.' }, 404);

  const isRaj = caller.work_email === 'raj@thecorvusstudio.com';
  if (!isRaj && !caller.can_remove_employee) {
    return c.json({ status: 'fail', message: 'You do not have permission to remove employees.' }, 403);
  }

  if (!id || isNaN(id)) {
    return c.json({ status: 'fail', message: 'Invalid employee ID.' }, 400);
  }

  // Prevent self-deletion
  if (id === jwtUser.userId) {
    return c.json({ status: 'fail', message: 'You cannot remove your own account.' }, 403);
  }

  // Fetch the employee record before deleting for the audit log
  const emp = await c.env.DB.prepare(
    `SELECT full_name, work_email FROM users WHERE id = ? LIMIT 1`
  ).bind(id).first();

  if (!emp) {
    return c.json({ status: 'fail', message: 'Employee not found.' }, 404);
  }

  // Parse optional soft-delete body params
  const body = await c.req.json().catch(() => ({}));
  const leavingReason = body.leaving_reason || 'Removed by Admin';
  const leavingDate = body.leaving_date || new Date().toISOString().split('T')[0];

  // Soft delete: update status = 'inactive', leaving_date, and leaving_reason
  await c.env.DB.prepare(
    `UPDATE users SET status = 'inactive', leaving_date = ?, leaving_reason = ? WHERE id = ?`
  ).bind(leavingDate, leavingReason, id).run();

  // Audit log — no email sent per spec
  await c.env.DB.prepare(
    `INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind('EMPLOYEE_REMOVED', jwtUser.userId, id, `Removed (Soft Delete): ${emp.full_name} (${emp.work_email})`).run();

  return c.json({ status: 'success', message: `Employee ${emp.full_name} has been removed.` });
});

app.on('PATCH', ['/api/v1/admin/employee/:id', '/admin/employee/:id'], auth, requireRole('admin'), async (c) => {
  const jwtUser = c.get('user');
  const id      = c.req.param('id');
  const body    = await c.req.json().catch(() => ({}));
  const { 
    fullName, role, designation, department, employeeType, joiningDate, contactNumber, status, personalEmail, dob,
    canApproveLeaves, canManageDocuments, canManageRoles
  } = body;

  const isRaj = jwtUser.email === 'raj@thecorvusstudio.com';

  if (!isRaj && (role !== undefined || canApproveLeaves !== undefined || canManageDocuments !== undefined || canManageRoles !== undefined)) {
    return c.json({ status: 'fail', message: 'Only the super admin Raj can update roles and permissions.' }, 403);
  }

  let query = 'UPDATE users SET ';
  const params = [];
  const updates = [];

  if (fullName !== undefined) { updates.push('full_name = ?'); params.push(fullName); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (designation !== undefined) { updates.push('designation = ?'); params.push(designation); }
  if (department !== undefined) { updates.push('department = ?'); params.push(department); }
  if (employeeType !== undefined) { updates.push('employee_type = ?'); params.push(employeeType); }
  if (joiningDate !== undefined) { updates.push('joining_date = ?'); params.push(joiningDate); }
  if (contactNumber !== undefined) { updates.push('contact_number = ?'); params.push(contactNumber); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (personalEmail !== undefined) { updates.push('personal_email = ?'); params.push(personalEmail); }
  if (dob !== undefined) { updates.push('dob = ?'); params.push(dob); }

  if (canApproveLeaves !== undefined) { updates.push('can_approve_leaves = ?'); params.push(canApproveLeaves ? 1 : 0); }
  if (canManageDocuments !== undefined) { updates.push('can_manage_documents = ?'); params.push(canManageDocuments ? 1 : 0); }
  if (canManageRoles !== undefined) { updates.push('can_manage_roles = ?'); params.push(canManageRoles ? 1 : 0); }

  if (updates.length === 0) {
    return c.json({ status: 'fail', message: 'No fields provided to update.' }, 400);
  }

  const numericId = Number(id);
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(numericId);

  await c.env.DB.prepare(query).bind(...params).run();

  const numericUserId = Number(jwtUser.userId);
  await c.env.DB.prepare(
    `INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind('EMPLOYEE_UPDATED', numericUserId, numericId, `Updated employee #${numericId}`).run();

  return c.json({ status: 'success', message: 'Employee updated successfully.' });
});


app.on('POST', ['/api/v1/admin/balance-override', '/admin/balance-override'], auth, requireRole('admin'), async (c) => {
  const jwtUser = c.get('user');
  const body    = await c.req.json().catch(() => ({}));
  const userId = body.userId || body.employeeId;
  const leaveTypeId = body.leaveTypeId;
  const action = body.action || 'set';
  const amount = parseFloat(body.amount !== undefined ? body.amount : (body.newBalance !== undefined ? body.newBalance : body.balance));

  if (!userId || !leaveTypeId || isNaN(amount)) {
    return c.json({ status: 'fail', message: 'userId, leaveTypeId, and amount are required.' }, 400);
  }

  const dbLeaveTypeId = mapFrontendToDbLeaveTypeId(leaveTypeId);
  
  if (action === 'add') {
    await c.env.DB.prepare(
      `UPDATE leave_balances SET balance = balance + ?, used = MAX(0, used - ?), updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND leave_type_id = ?`
    ).bind(amount, amount, userId, dbLeaveTypeId).run();
  } else if (action === 'subtract') {
    await c.env.DB.prepare(
      `UPDATE leave_balances SET balance = MAX(0, balance - ?), used = used + ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND leave_type_id = ?`
    ).bind(amount, amount, userId, dbLeaveTypeId).run();
  } else {
    await c.env.DB.prepare(
      `UPDATE leave_balances SET balance = ? - used, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND leave_type_id = ?`
    ).bind(amount, userId, dbLeaveTypeId).run();
  }

  await c.env.DB.prepare(
    `INSERT INTO audit_logs (action, performed_by, target_user_id, details, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind('BALANCE_OVERRIDE', jwtUser.userId, userId, `${action} balance by/to ${amount} for leaveType=${dbLeaveTypeId}`).run();

  return c.json({ status: 'success', message: 'Leave balance updated.' });
});

// ─── Admin Email Templates ────────────────────────────────────────────────────

app.on('GET', ['/api/v1/admin/email-templates', '/admin/email-templates'], auth, requireRole('admin'), async (c) => {
  try {
    const list = await c.env.DB.prepare(`SELECT * FROM email_templates`).all();
    return c.json({ status: 'success', data: list.results || [] });
  } catch (err) {
    return c.json({ status: 'fail', message: 'Failed to fetch templates' }, 500);
  }
});

app.on('PATCH', ['/api/v1/admin/email-templates/:id', '/admin/email-templates/:id'], auth, requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  
  if (!body.subject || !body.html_body) {
    return c.json({ status: 'fail', message: 'Subject and html_body required' }, 400);
  }

  try {
    await c.env.DB.prepare(`
      UPDATE email_templates 
      SET subject = ?, html_body = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(body.subject, body.html_body, id).run();

    return c.json({ status: 'success', message: 'Template updated successfully' });
  } catch (err) {
    return c.json({ status: 'fail', message: 'Failed to update template' }, 500);
  }
});

// ─── Analytics Routes ─────────────────────────────────────────────────────────

app.on('GET', ['/api/v1/analytics/stats', '/analytics/stats'], auth, async (c) => {
  const jwtUser = c.get('user');
  const dbUser = await c.env.DB.prepare(
    `SELECT id, role, department, work_email FROM users WHERE id = ? LIMIT 1`
  ).bind(jwtUser.userId).first();

  let empCount;
  if (dbUser.role === 'manager' && dbUser.work_email !== 'nihar@thecorvusstudio.com') {
    const r = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users WHERE department = ? AND status = 'active'`
    ).bind(dbUser.department).first();
    empCount = r.count;
  } else {
    const r = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users WHERE status = 'active'`
    ).first();
    empCount = r.count;
  }

  const pendingResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM leave_requests WHERE status IN ('pending', 'pending_medical')`
  ).first();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLeaves = await c.env.DB.prepare(
    `SELECT lr.id, u.full_name, u.department, u.designation
     FROM leave_requests lr
     JOIN users u ON lr.employee_id = u.id
     WHERE lr.status = 'approved' AND lr.from_date <= ? AND lr.to_date >= ?`
  ).bind(todayStr, todayStr).all();

  const auditResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM audit_logs`
  ).first();

  return c.json({
    status: 'success',
    data: {
      activeEmployees: empCount,
      pendingApprovals: pendingResult.count,
      todayOnLeaveCount: todayLeaves.results.length,
      todayOnLeaveList: todayLeaves.results.map((l) => ({
        fullName: l.full_name,
        department: l.department,
        designation: l.designation,
      })),
      operationsLogged: auditResult.count,
    },
  });
});

app.on('GET', ['/api/v1/analytics/monthly', '/analytics/monthly'], auth, async (c) => {
  const jwtUser = c.get('user');
  const dbUser = await c.env.DB.prepare(
    `SELECT id, role, department, work_email FROM users WHERE id = ? LIMIT 1`
  ).bind(jwtUser.userId).first();

  const month = parseInt(c.req.query('month')) || new Date().getMonth() + 1;
  const year  = parseInt(c.req.query('year'))  || new Date().getFullYear();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay   = new Date(year, month, 0).getDate();
  const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  let query = `
    SELECT lr.*, u.full_name, u.department, u.role as user_role, u.employee_type
    FROM leave_requests lr
    JOIN users u ON lr.employee_id = u.id
    WHERE lr.status != 'rejected'
      AND lr.from_date <= ? AND lr.to_date >= ?
  `;
  let params = [endDate, startDate];

  const deptFilter = c.req.query('department');
  
  if (dbUser.role === 'manager' && dbUser.work_email !== 'nihar@thecorvusstudio.com') {
    query += ` AND u.department = ?`;
    params.push(dbUser.department);
  } else if (deptFilter) {
    query += ` AND u.department = ?`;
    params.push(deptFilter);
  }

  const requestsResult = await c.env.DB.prepare(query).bind(...params).all();
  const requests = requestsResult.results;

  // Fetch all holidays falling within the month's date range
  const holidaysResult = await c.env.DB.prepare(
    `SELECT holiday_date FROM holidays WHERE holiday_date BETWEEN ? AND ?`
  ).bind(startDate, endDate).all();
  const holidayDates = new Set(holidaysResult.results.map(h => h.holiday_date));

  const userIsApprover = dbUser.role === 'admin' || dbUser.role === 'senior_manager';

  const STUDIO_DEPARTMENTS = ['Production', 'Creative', 'Engineering', 'Leadership', 'Operations'];
  const LEAVE_RISK_THRESHOLD = 2;

  const daysData = {};
  const tooltips = {};
  const riskAlerts = {};
  const departmentsFound = new Set();

  for (let d = 1; d <= lastDay; d++) {
    daysData[d] = {};
    tooltips[d] = [];
  }

  requests.forEach((req) => {
    const dept = req.department || 'Unassigned';
    departmentsFound.add(dept);

    const fromTs = new Date(`${req.from_date}T00:00:00Z`).getTime();
    const toTs = new Date(`${req.to_date}T00:00:00Z`).getTime();

    for (let d = 1; d <= lastDay; d++) {
      const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const current = new Date(`${currentDateStr}T00:00:00Z`);
      const dayOfWeek = current.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(currentDateStr);

      // Exclude weekends and public holidays from team leave counts
      if (isWeekend || isHoliday) {
        continue;
      }

      const currentTs = current.getTime();

      if (currentTs >= fromTs && currentTs <= toTs) {
        if (!daysData[d][dept]) {
          daysData[d][dept] = 0;
        }

        daysData[d][dept] += 1;

        tooltips[d].push({
          employeeName: req.full_name,
          department: userIsApprover ? dept : null,
          dates: userIsApprover ? `${req.from_date} to ${req.to_date}` : null,
          leaveType: userIsApprover ? req.leave_type : null,
          status: userIsApprover ? req.status : null,
        });

        if (daysData[d][dept] > LEAVE_RISK_THRESHOLD) {
          if (!riskAlerts[currentDateStr]) {
            riskAlerts[currentDateStr] = [];
          }
          if (!riskAlerts[currentDateStr].includes(dept)) {
            riskAlerts[currentDateStr].push(dept);
          }
        }
      }
    }
  });

  const uniqueDepts = Array.from(new Set([...STUDIO_DEPARTMENTS, ...departmentsFound]));
  const series = [];

  uniqueDepts.forEach((dept) => {
    if (dbUser.role === 'manager' && dbUser.work_email !== 'nihar@thecorvusstudio.com' && dept !== dbUser.department) {
      return;
    }

    const dataPoints = [];
    for (let d = 1; d <= lastDay; d++) {
      dataPoints.push(daysData[d][dept] || 0);
    }

    series.push({
      name: dept,
      data: dataPoints,
    });
  });

  const tempDate = new Date(year, month - 1, 1);
  const monthName = tempDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return c.json({
    status: 'success',
    data: {
      series,
      tooltips,
      daysInMonth: lastDay,
      riskAlerts,
      monthName,
    },
  });
});

app.on('POST', ['/api/v1/admin/offer-letters/generate', '/admin/offer-letters/generate'], auth, requireRole('admin'), async (c) => {
  try {
    const jwtUser = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const { employee_id, options } = body;

    if (employee_id === undefined || employee_id === null || employee_id === '') {
      return c.json({ status: 'fail', message: 'employee_id is required.' }, 400);
    }

    const isNewCandidate = employee_id === 'new' || employee_id === 0 || String(employee_id) === '0' || String(employee_id) === 'new';
    let employee;
    if (isNewCandidate) {
      employee = {
        id: 0,
        full_name: options?.candidateName || 'Candidate',
        employee_type: options?.employmentType || 'Full-time',
        personal_email: options?.personalEmail || '',
        work_email: options?.workEmail || '',
        designation: options?.jobRole || 'Artist',
        department: options?.department || 'Production',
        joining_date: options?.joiningDate || ''
      };
    } else {
      employee = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(employee_id).first();
      if (!employee) {
        return c.json({ status: 'fail', message: 'Employee not found.' }, 404);
      }
    }

    const employmentType = detectEmploymentType(employee.employee_type);

    // Document IDs are DRAFT until the email is sent — no DB write here.
    // The real permanent ID is committed only in the send-email endpoint.
    let documentId;
    if (body.document_id) {
      // Caller explicitly passed an ID (e.g. re-generate after email was sent)
      documentId = body.document_id;
    } else {
      // Return a human-readable DRAFT placeholder so the preview shows something meaningful
      const docType = body.documentType || options?.documentType || 'Document';
      const empCode  = (!isNewCandidate && (employee.employee_code || employee.employeeCode))
                         ? (employee.employee_code || employee.employeeCode)
                         : null;
      const prefix   = {
        'Offer Letter':                        'OL',
        'Salary Certificate':                  'SC',
        'Experience Letter':                   'EL',
        'Confirmation Letter':                 'CL',
        'Relieving Letter':                    'RL',
        'Increment Letter':                    'IL',
        'Promotion Letter':                    'PLT',
        'No Objection Certificate (NOC)':      'NOC',
        'Appreciation Letter':                 'APL',
        'Warning Letter':                      'WL',
        'Show Cause Notice':                   'SCN',
        'Employment Verification Certificate': 'EVC',
        'Resignation Acceptance Letter':       'RA',
        'Full & Final Settlement Letter':      'FFS',
        'Probation Extension Letter':          'PE',
      }[docType] || 'DOC';
      documentId = empCode ? `${prefix}/${empCode}/DRAFT` : `${prefix}/DRAFT`;
    }

    // Generate authentic Corvus Studio offer letter based on role + employment type
    const documentHtml = generateOfferLetterHtml(employee, documentId, options || {});
    const templateUsed = selectTemplate(employee, options || {});

    return c.json({
      status: 'success',
      data: {
        document_id: documentId,
        employment_type: employmentType,
        template_used: templateUsed,
        html_content: documentHtml
      }
    });
  } catch (err) {
    console.error('[offer-letter-generate]', err);
    return c.json({ status: 'fail', message: err?.message || 'Internal server error generating offer letter.' }, 500);
  }
});

async function generateAiEmailBody(c, document_type, employee, jobRole) {
  if (!c.env.AI) {
    console.log('AI binding not found. Falling back to static templates.');
    return null;
  }

  try {
    const prompt = `Write a formal, corporate, to-the-point email body (paragraphs) for an employee receiving a "${document_type}" from their company "The Corvus Studio".
The employee is "${employee.full_name}" who is designated as "${jobRole}".
The email must explain the business purpose of the attached "${document_type}" and any immediate actions required, in a direct and professional HR tone.

Strict Style Guidelines:
1. No conversational fluff or filler sentences (do NOT say: "Hope this email finds you well", "We are pleased/thrilled/excited to...", "Congratulations!", "We hope you are doing well").
2. No AI-like jargon, emojis, or exclamation marks. Keep it completely formal and human.
3. No markdown formatting (do NOT use asterisks, backticks, or hashes, e.g., **bold**, *italic*). Use standard HTML bold tags (<strong>) if emphasizing a name or document type.
4. Do NOT write any greeting (e.g. "Dear ...") or sign-off/signature block (e.g. "Best regards...").
5. Return ONLY the body paragraphs formatted in clean HTML (<p> or <ul>/<li>). No outer wrapper, no conversational chatter.`;

    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a senior corporate HR Director. You draft direct, formal, and concise email body paragraphs in clean HTML. You never include conversational introductions, greetings, signature blocks, markdown bold tags (**), or generic AI phrases.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    if (result && result.response) {
      // Remove any trailing/leading markdown code block indicators if returned by AI
      let cleanText = result.response.trim();
      if (cleanText.startsWith('```html')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      return cleanText.trim();
    }
  } catch (err) {
    console.error('Failed to generate AI email body:', err);
  }

  return null;
}

function getEmailBody(document_type, employee, jobRole) {
  const containerStart = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; letter-spacing: 0.5px; font-weight: 800;">THE CORVUS STUDIO</h2>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0 24px;" />
        <p style="color: #1e293b; font-size: 14px; margin-bottom: 16px; font-weight: 600;">Dear ${employee.full_name},</p>
  `;

  const containerEnd = `
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
        <p style="color: #475569; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">
          If you have any questions or require further details, please reach out to the HR Operations desk at <a href="mailto:careers@thecorvusstudio.com" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">careers@thecorvusstudio.com</a>.
        </p>
        <p style="color: #334155; font-size: 14px; margin-top: 24px; line-height: 1.5;">
          Best Regards,<br/>
          <strong>HR Operations Team</strong><br/>
          <span style="color: #64748b; font-size: 12px;">The Corvus Studio</span><br/>
          <a href="mailto:careers@thecorvusstudio.com" style="color: #0ea5e9; text-decoration: none; font-size: 12px;">careers@thecorvusstudio.com</a>
        </p>
      </div>
    </div>
  `;

  let body = '';

  switch (document_type) {
    case 'Offer Letter':
    case 'Appointment Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find the official <strong>${document_type}</strong> for the position of <strong>${jobRole}</strong> at <strong>The Corvus Studio</strong> attached to this email.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Kindly review the terms and conditions carefully. To confirm your acceptance of this offer, please sign the document where indicated and return the executed copy to <a href="mailto:careers@thecorvusstudio.com" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">careers@thecorvusstudio.com</a>.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Upon receipt of the signed copy, the HR operations team will share onboarding instructions, joining formalities, and induction schedule details.
        </p>
      `;
      break;

    case 'Confirmation Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          This email confirms the successful completion of your probation period. Please find your official <strong>Confirmation Letter</strong> for the position of <strong>${jobRole}</strong> at <strong>The Corvus Studio</strong> attached.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          We appreciate your dedication and contribution during your probation period and look forward to your continued association with the company.
        </p>
      `;
      break;

    case 'Salary Certificate':
    case 'Employment Verification Certificate':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          As requested, we have issued your official <strong>${document_type}</strong> confirming your current employment status, designation as <strong>${jobRole}</strong>, and compensation details at The Corvus Studio.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find the verified document attached to this email. This certificate is provided for your reference or onward submission to the requesting authority.
        </p>
      `;
      break;

    case 'Experience Letter':
    case 'Relieving Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find attached your official <strong>${document_type}</strong> from The Corvus Studio, confirming your service tenure and formal exit parameters.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          We acknowledge your contributions during your tenure and wish you success in your future professional endeavors.
        </p>
      `;
      break;

    case 'Increment Letter':
    case 'Promotion Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find attached your official <strong>${document_type}</strong> in recognition of your performance and growth at The Corvus Studio.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          This letter details your revised compensation structure and/or designation as <strong>${jobRole}</strong>, effective from the date specified in the document.
        </p>
      `;
      break;

    case 'Resignation Acceptance Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          This email confirms the formal acceptance of your resignation from your position as <strong>${jobRole}</strong>.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find the attached <strong>Resignation Acceptance Letter</strong> which outlines your transition period, last working day parameters, and handover requirements.
        </p>
      `;
      break;

    case 'Full & Final Settlement Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find attached your official <strong>Full & Final Settlement Letter</strong> from The Corvus Studio.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          This document summarizes the close-out details of your account, including the calculation of outstanding dues, leave encashment adjustments, and final disbursement details.
        </p>
      `;
      break;

    case 'No Objection Certificate (NOC)':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          As requested, we have issued your official <strong>No Objection Certificate (NOC)</strong> from The Corvus Studio.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find the document attached to this email, confirming that the company has no objection to the requested activity as per our records.
        </p>
      `;
      break;

    case 'Appreciation Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find attached the official <strong>Letter of Appreciation</strong> issued in recognition of your recent contributions at The Corvus Studio.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          The management appreciates your commitment and effort towards the project objectives.
        </p>
      `;
      break;

    case 'Warning Letter':
    case 'Show Cause Notice':
      body = `
        <p style="color: #e11d48; font-size: 14px; line-height: 1.7; margin-bottom: 16px; font-weight: 600;">
          Formal Disciplinary Notice
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find attached your official <strong>${document_type}</strong> from The Corvus Studio HR Operations.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          You are instructed to review this document. If a response, explanation, or corrective action plan is requested, please submit it as detailed within the document within the specified timeframe.
        </p>
      `;
      break;

    case 'Probation Extension Letter':
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find attached your official <strong>Probation Extension Letter</strong> from The Corvus Studio.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          This letter details the extension of your evaluation period to provide further opportunity to align your performance with the company's expectations.
        </p>
      `;
      break;

    default:
      body = `
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Please find attached your official <strong>${document_type}</strong> from The Corvus Studio.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
          Kindly review the document carefully and keep a copy for your reference. If an acknowledgement or signed copy is required by HR, please reply to this email with the completed copy.
        </p>
      `;
  }

  return containerStart + body + containerEnd;
}

app.on('POST', ['/api/v1/admin/offer-letters/send-email', '/admin/offer-letters/send-email'], auth, requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { employee_id, document_id, pdf_base64 } = body;

  if ((employee_id === undefined || employee_id === null || employee_id === '') || !document_id) {
    return c.json({ status: 'fail', message: 'employee_id and document_id are required.' }, 400);
  }

  const document_type = body.document_type || 'Offer Letter';

  const isNewCandidate = employee_id === 'new' || employee_id === 0 || String(employee_id) === '0' || String(employee_id) === 'new';
  let employee;
  if (isNewCandidate) {
    employee = {
      id: 0,
      full_name: body.candidate_name || 'Candidate',
      personal_email: body.personal_email || '',
      work_email: body.work_email || '',
      designation: body.job_role || 'Artist'
    };
  } else {
    employee = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(employee_id).first();
    if (!employee) {
      return c.json({ status: 'fail', message: 'Employee not found.' }, 404);
    }
  }

  const recipientEmail = employee.personal_email;
  if (!recipientEmail) {
    return c.json({ status: 'fail', message: 'No personal email address found for this candidate. Please enter a valid personal email.' }, 400);
  }

  // CC: Corvus Official Email only if already assigned
  const ccEmails = [];
  if (employee.work_email) {
    ccEmails.push(employee.work_email);
  }

  // BCC: careers inbox (always)
  const bccEmails = ['careers@thecorvusstudio.com'];

  const jobRole = body.job_role || employee.designation || 'the offered position';

  // Dynamic Subject Mapping
  let subject = '';
  switch (document_type) {
    case 'Offer Letter':
      subject = `Offer of Employment – The Corvus Studio`;
      break;
    case 'Appointment Letter':
      subject = `Appointment Letter – The Corvus Studio`;
      break;
    case 'Confirmation Letter':
      subject = `Employment Confirmation Letter – The Corvus Studio`;
      break;
    case 'Experience Letter':
      subject = `Work Experience Certificate – The Corvus Studio`;
      break;
    case 'Relieving Letter':
      subject = `Relieving Letter – The Corvus Studio`;
      break;
    case 'Salary Certificate':
      subject = `Salary Certificate – The Corvus Studio`;
      break;
    case 'Employment Verification Certificate':
      subject = `Employment Verification Certificate – The Corvus Studio`;
      break;
    case 'Increment Letter':
      subject = `Salary Increment Letter – The Corvus Studio`;
      break;
    case 'Promotion Letter':
      subject = `Promotion Letter – The Corvus Studio`;
      break;
    case 'Resignation Acceptance Letter':
      subject = `Resignation Acceptance – The Corvus Studio`;
      break;
    case 'Full & Final Settlement Letter':
      subject = `Full & Final Settlement – The Corvus Studio`;
      break;
    case 'No Objection Certificate (NOC)':
      subject = `No Objection Certificate (NOC) – The Corvus Studio`;
      break;
    case 'Appreciation Letter':
      subject = `Letter of Appreciation – The Corvus Studio`;
      break;
    case 'Warning Letter':
      subject = `Warning Letter – Disciplinary Notice – The Corvus Studio`;
      break;
    case 'Show Cause Notice':
      subject = `Show Cause Notice – Disciplinary Action – The Corvus Studio`;
      break;
    case 'Probation Extension Letter':
      subject = `Probation Extension Letter – The Corvus Studio`;
      break;
    default:
      subject = `${document_type} – The Corvus Studio`;
  }

  // Dynamic Email Body Mapping
  const fallbackHtml = getEmailBody(document_type, employee, jobRole);
  let emailHtml = fallbackHtml;

  const aiBody = await generateAiEmailBody(c, document_type, employee, jobRole);
  if (aiBody) {
    emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 24px;">
        <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; letter-spacing: 0.5px; font-weight: 800;">THE CORVUS STUDIO</h2>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0 24px;" />
          <p style="color: #1e293b; font-size: 14px; margin-bottom: 16px; font-weight: 600;">Dear ${employee.full_name},</p>
          
          <div style="color: #334155; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
            ${aiBody}
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="color: #475569; font-size: 12px; line-height: 1.6; margin-bottom: 20px;">
            If you have any questions or require further details, please reach out to the HR Operations desk at <a href="mailto:careers@thecorvusstudio.com" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">careers@thecorvusstudio.com</a>.
          </p>
          <p style="color: #334155; font-size: 14px; margin-top: 24px; line-height: 1.5;">
            Best Regards,<br/>
            <strong>HR Operations Team</strong><br/>
            <span style="color: #64748b; font-size: 12px;">The Corvus Studio</span><br/>
            <a href="mailto:careers@thecorvusstudio.com" style="color: #0ea5e9; text-decoration: none; font-size: 12px;">careers@thecorvusstudio.com</a>
          </p>
        </div>
      </div>
    `;
  }

  const attachments = pdf_base64 ? [
    {
      filename: `${document_type.replace(/\s+/g, '_')}_${employee.full_name.replace(/\s+/g, '_')}.pdf`,
      content: pdf_base64,
    }
  ] : undefined;

  // ── Commit the permanent document ID when email is actually sent ──────────
  let finalDocId = document_id;
  if (!document_id || document_id.includes('DRAFT') || !document_id.trim()) {
    // Generate and store the real permanent ID now
    finalDocId = await generateDocumentId(
      c.env.DB,
      document_type,
      isNewCandidate ? (body.employee_code || null) : (employee.employee_code || employee.employeeCode || null)
    );
    const createdBy = body.created_by || null;
    const empIdForDb = isNewCandidate ? 0 : employee.id;
    const empType    = isNewCandidate ? (body.employment_type || 'Full-Time') : (employee.employee_type || 'Full-Time');
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO offer_letters (document_id, employee_id, employment_type, created_by) VALUES (?, ?, ?, ?)`
    ).bind(finalDocId, empIdForDb, empType, createdBy).run();
  }

  await sendNotificationEmail(c.env.RESEND_API_KEY, {
    to: recipientEmail,
    cc: ccEmails.length ? ccEmails : undefined,
    bcc: bccEmails,
    subject: subject,
    html: emailHtml,
    attachments
  });

  return c.json({
    status: 'success',
    message: `${document_type} emailed to ${recipientEmail}${ccEmails.length ? ` (CC: ${ccEmails.join(', ')})` : ''}.`,
    data: { document_id: finalDocId }
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json(
    { status: 'fail', message: `Can't find ${new URL(c.req.url).pathname} on this server.` },
    404
  );
});

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduledReminders(env));
  }
};

