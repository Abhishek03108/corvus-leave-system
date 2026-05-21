import { config } from './src/config/index.js';
import { sendOTPEmail } from './src/services/mailService.js';

const testSMTP = async () => {
  console.log('--- Staging SMTP Test ---');
  console.log(`Testing with SMTP Host: ${config.smtp.host}:${config.smtp.port}`);
  console.log(`Using User: ${config.smtp.user}`);
  
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    console.error('❌ ERROR: Missing SMTP credentials in environment.');
    console.error('Please make sure SMTP_HOST, SMTP_USER, and SMTP_PASS are set.');
    process.exit(1);
  }

  try {
    const testEmail = process.argv[2] || 'raj@thecorvusstudio.com';
    const testOtp = '999999';
    console.log(`Attempting to send test OTP email to: ${testEmail}...`);
    
    const info = await sendOTPEmail(testEmail, testOtp);
    console.log('✅ SUCCESS: Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Please check the inbox for ${testEmail} to verify delivery formatting.`);
  } catch (error) {
    console.error('❌ ERROR: Failed to send email.');
    console.error(error.message);
    process.exit(1);
  }
};

testSMTP();
