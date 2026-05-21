import { Hono } from 'hono';
import { signAccessToken, signRefreshToken } from './src/utils/jwt.js';

import { cors } from 'hono/cors';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: 'https://leave.thecorvusstudio.com',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.get('/', (c) => {
  return c.json({
    status: 'success',
    message: 'Corvus Leave API worker is running.',
  });
});

app.get('/api/health', async (c) => {

  const result = await c.env.DB.prepare(
    'SELECT * FROM users'
  ).all();

  return c.json({
    status: 'success',
    totalUsers: result.results.length,
    users: result.results,
  });
});

const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 900000 + 100000);
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
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
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Corvus Studio</h2>
          <p>Your one-time password is:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px;">${otp}</div>
          <p>This OTP expires in 5 minutes.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend failed: ${response.status} ${errorText}`);
  }
}

app.post('/api/v1/auth/request-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();

  if (!email) {
    return c.json(
      { status: 'fail', message: 'Email is required.' },
      400
    );
  }

  const user = await c.env.DB.prepare(
    `
    SELECT id, full_name, work_email, role
    FROM users
    WHERE work_email = ?
    LIMIT 1
    `
  )
    .bind(email)
    .first();

  if (!user) {
    return c.json(
      { status: 'fail', message: 'Employee not found.' },
      404
    );
  }

  const otp = generateOtp();
  const otpHash = await sha256Hex(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await c.env.DB.prepare(
    `
    INSERT INTO otp_codes (email, otp_hash, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET
      otp_hash = excluded.otp_hash,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
    `
  )
    .bind(email, otpHash, expiresAt)
    .run();

  await sendOtpEmail(c.env.RESEND_API_KEY, email, otp);

  return c.json({
    status: 'success',
    message: 'OTP sent successfully to your work email.',
  });
});

app.post('/api/v1/auth/verify-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();
  const otp = String(body.otp || '').trim();

  if (!email || !otp) {
    return c.json(
      { status: 'fail', message: 'Email and otp are required.' },
      400
    );
  }

  const otpRecord = await c.env.DB.prepare(
    `
    SELECT * FROM otp_codes
    WHERE email = ?
    LIMIT 1
    `
  )
    .bind(email)
    .first();

  if (!otpRecord) {
    return c.json(
      { status: 'fail', message: 'OTP has expired or is invalid.' },
      400
    );
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    await c.env.DB.prepare(
      `DELETE FROM otp_codes WHERE email = ?`
    )
      .bind(email)
      .run();

    return c.json(
      { status: 'fail', message: 'OTP has expired or is invalid.' },
      400
    );
  }

  const incomingHash = await sha256Hex(otp);

  if (incomingHash !== otpRecord.otp_hash) {
    return c.json(
      { status: 'fail', message: 'Invalid OTP code provided.' },
      400
    );
  }

  await c.env.DB.prepare(
    `DELETE FROM otp_codes WHERE email = ?`
  )
    .bind(email)
    .run();

  const user = await c.env.DB.prepare(
    `
    SELECT id, full_name, work_email, role
    FROM users
    WHERE work_email = ?
    LIMIT 1
    `
  )
    .bind(email)
    .first();

  if (!user) {
    return c.json(
      { status: 'fail', message: 'Employee not found.' },
      404
    );
  }

  const accessToken = await signAccessToken(
    {
      userId: user.id,
      role: user.role,
      email: user.work_email,
    },
    c.env.JWT_SECRET
  );

  const refreshToken = await signRefreshToken(
    { userId: user.id },
    c.env.JWT_REFRESH_SECRET
  );

  return c.json({
    status: 'success',
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      workEmail: user.work_email,
      role: user.role,
    },
  });
});

app.notFound((c) => {
  return c.json(
    {
      status: 'fail',
      message: `Can't find ${new URL(c.req.url).pathname} on this server.`,
    },
    404
  );
});

export default app;
