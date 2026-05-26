const BASE = 'https://corvus-leave-system.rajkishore-3d.workers.dev';
const EMAIL = 'raj@thecorvusstudio.com';

async function run() {
  console.log('\n== STEP 1: Request OTP ==');
  const r1 = await fetch(`${BASE}/api/v1/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL }),
  });
  const d1 = await r1.json();
  console.log(d1);

  // Wait for D1 to settle
  await new Promise(res => setTimeout(res, 2000));

  // Read OTP from wrangler D1 via child_process
  const { execSync } = await import('child_process');
  const raw = execSync(
    'npx wrangler d1 execute corvus_leave_db --command "SELECT otp_hash FROM otp_codes WHERE email = \'raj@thecorvusstudio.com\' LIMIT 1" --remote --json',
    { cwd: process.cwd(), encoding: 'utf-8' }
  );
  const parsed = JSON.parse(raw);
  const otp = parsed[0]?.results?.[0]?.otp_hash;
  if (!otp) { console.error('Could not read OTP from D1'); process.exit(1); }
  console.log('\n== OTP from D1 ==', otp);

  console.log('\n== STEP 2: Verify OTP ==');
  const r2 = await fetch(`${BASE}/api/v1/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, otp }),
  });
  const d2 = await r2.json();
  const token = d2.accessToken;
  console.log('status:', d2.status);
  console.log('user:', d2.user);
  if (!token) { console.error('No token'); process.exit(1); }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  console.log('\n== STEP 3: GET /api/v1/analytics/stats ==');
  const r3 = await fetch(`${BASE}/api/v1/analytics/stats`, { headers });
  console.log('HTTP', r3.status);
  console.log(JSON.stringify(await r3.json(), null, 2));

  console.log('\n== STEP 4: GET /api/v1/user/list ==');
  const r4 = await fetch(`${BASE}/api/v1/user/list`, { headers });
  console.log('HTTP', r4.status);
  const userList = await r4.json();
  console.log('total employees returned:', userList.data?.length);
  console.log('first employee:', userList.data?.[0]);

  console.log('\n== STEP 5: GET /api/v1/user/profile ==');
  const r5 = await fetch(`${BASE}/api/v1/user/profile`, { headers });
  console.log('HTTP', r5.status);
  console.log(JSON.stringify(await r5.json(), null, 2));

  console.log('\n== STEP 6: GET /api/v1/leave/balances ==');
  const r6 = await fetch(`${BASE}/api/v1/leave/balances`, { headers });
  console.log('HTTP', r6.status);
  console.log(JSON.stringify(await r6.json(), null, 2));
}

run().catch(console.error);
