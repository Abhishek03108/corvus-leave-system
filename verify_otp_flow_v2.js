import { spawn } from 'child_process';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const d1Dir = path.join(
  process.cwd(),
  '.wrangler',
  'state',
  'v3',
  'd1',
  'miniflare-D1DatabaseObject'
);

let dbFile = '';
if (fs.existsSync(d1Dir)) {
  const files = fs.readdirSync(d1Dir);
  const sqliteFile = files.find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  if (sqliteFile) {
    dbFile = path.join(d1Dir, sqliteFile);
  }
}

if (!dbFile) {
  console.error('SQLite DB file not found in ' + d1Dir);
  process.exit(1);
}

console.log('Using DB file:', dbFile);

function getStoredOtpHash(email) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbFile);
    db.get(
      'SELECT otp_hash FROM otp_codes WHERE email = ? LIMIT 1',
      [email],
      (err, row) => {
        db.close();
        if (err) reject(err);
        else resolve(row ? row.otp_hash : null);
      }
    );
  });
}

async function sha256Hex(input) {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}

async function bruteForceOtp(targetHash) {
  for (let i = 100000; i <= 999999; i++) {
    const code = String(i);
    const hash = await sha256Hex(code);
    if (hash === targetHash) {
      return code;
    }
  }
  return null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('Starting Wrangler Dev Server...');
  const wrangler = spawn('npx', ['wrangler', 'dev', '--port', '8787'], {
    shell: true,
    stdio: 'pipe',
  });

  wrangler.stderr.on('data', data => {
    console.error(`[Wrangler Error] ${data.toString()}`);
  });

  // Wait for wrangler server to boot
  await sleep(4000);

  const email = 'raj@thecorvusstudio.com';

  try {
    console.log(`\nStep 1: Requesting OTP for ${email}...`);
    const reqResponse = await fetch('http://localhost:8787/api/v1/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const reqJson = await reqResponse.json();
    console.log('Response:', reqResponse.status, reqJson);

    if (reqResponse.status !== 200) {
      throw new Error('Request OTP failed');
    }

    console.log('\nStep 2: Retrieving stored OTP hash from D1 SQLite...');
    const storedHash = await getStoredOtpHash(email);
    console.log('Stored Hash:', storedHash);

    if (!storedHash) {
      throw new Error('No OTP hash found in database');
    }

    console.log('\nStep 3: Finding plaintext OTP from hash...');
    const decryptedOtp = await bruteForceOtp(storedHash);
    console.log('Decrypted OTP:', decryptedOtp);

    if (!decryptedOtp) {
      throw new Error('Could not decrypt OTP');
    }

    console.log('\nStep 4: Calling verify-otp endpoint...');
    const verifyResponse = await fetch('http://localhost:8787/api/v1/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: decryptedOtp }),
    });

    const verifyJson = await verifyResponse.json();
    console.log('Response:', verifyResponse.status, JSON.stringify(verifyJson, null, 2));

  } catch (error) {
    console.error('Error during test flow:', error.message);
  } finally {
    console.log('\nStopping Wrangler dev server...');
    wrangler.kill();
    process.exit(0);
  }
})();
