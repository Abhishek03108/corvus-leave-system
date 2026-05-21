import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const { smtp, isProduction } = config;

  if (smtp.host && smtp.user && smtp.pass) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465, // True for port 465, false for 587 (STARTTLS)
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
    console.log('[Mail] SMTP Transporter configured.');
  } else {
    if (isProduction) {
      console.error('[Mail] Fatal Error: SMTP credentials are required in production.');
      process.exit(1);
    }
    // Fallback Mock Transporter for easy out-of-the-box local testing
    console.log('[Mail] Missing SMTP credentials. Using log-only mock mail transporter.');
    transporter = {
      sendMail: async (mailOptions) => {
        const logContent = `\n=============== MOCK EMAIL SENT [${new Date().toISOString()}] ===============\nTo:      ${mailOptions.to}\nSubject: ${mailOptions.subject}\n------------------ Content -------------------\n${mailOptions.text || mailOptions.html}\n==============================================\n`;
        console.log(logContent);
        try {
          fs.appendFileSync(path.join(process.cwd(), 'mock_emails.log'), logContent);
        } catch (err) {
          console.error('Failed to write mock email to file', err);
        }
        return { messageId: `mock-id-${Date.now()}` };
      },
    };
  }

  return transporter;
};

/**
 * Send an OTP Email with a beautiful premium layout matching Corvus Studio branding
 */
export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Corvus Studio Leave System" <${config.smtp.user || 'noreply@thecorvusstudio.com'}>`,
    to: email,
    subject: `Your OTP for Corvus Leave System: ${otp}`,
    html: `
      <div style="background-color: #F4F6F8; padding: 40px; font-family: 'Inter', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #E8ECF0;">
          <!-- Header -->
          <div style="background-color: #0A0B0D; padding: 30px; text-align: center;">
            <h1 style="color: #2FB7C9; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 700;">CORVUS STUDIO</h1>
            <p style="color: #8A939E; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Leave Portal</p>
          </div>
          <!-- Body -->
          <div style="padding: 40px; color: #14181F;">
            <h2 style="font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Secure Login Access</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #555;">Hello,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #555;">Use the one-time password (OTP) below to authenticate your session. This OTP is valid for 5 minutes and can only be used once.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <span style="display: inline-block; background-color: #F4F6F8; color: #1F7A8C; font-size: 36px; font-weight: 700; letter-spacing: 6px; padding: 15px 30px; border-radius: 8px; border: 1px dashed #2FB7C9; font-family: monospace;">${otp}</span>
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: #8A939E;">If you did not request this OTP, please ignore this email or reach out to security operations.</p>
          </div>
          <!-- Footer -->
          <div style="background-color: #F4F6F8; padding: 20px; text-align: center; border-top: 1px solid #E8ECF0; font-size: 12px; color: #8A939E;">
            &copy; 2026 Corvus Studio. All rights reserved.
          </div>
        </div>
      </div>
    `,
  };

  return await getTransporter().sendMail(mailOptions);
};

/**
 * Send a notification regarding Leave Status changes (Approved/Rejected/Pending)
 */
export const sendLeaveStatusEmail = async (email, employeeName, leaveDetails) => {
  const { fromDate, toDate, leaveCount, leaveTypeName, status, managerComment } = leaveDetails;
  
  let statusBadgeColor = '#F59E0B'; // Pending
  let statusText = 'Pending Approval';
  
  if (status === 'approved') {
    statusBadgeColor = '#10B981';
    statusText = 'Approved';
  } else if (status === 'rejected') {
    statusBadgeColor = '#EF4444';
    statusText = 'Rejected';
  } else if (status === 'pending_medical') {
    statusBadgeColor = '#3B82F6';
    statusText = 'Pending Medical Compliance Review';
  }

  const mailOptions = {
    from: `"Corvus Studio Leave System" <${config.smtp.user || 'noreply@thecorvusstudio.com'}>`,
    to: email,
    subject: `Leave Request Update: ${statusText}`,
    html: `
      <div style="background-color: #F4F6F8; padding: 40px; font-family: 'Inter', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #E8ECF0;">
          <!-- Header -->
          <div style="background-color: #0A0B0D; padding: 30px; text-align: center;">
            <h1 style="color: #2FB7C9; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 700;">CORVUS STUDIO</h1>
            <p style="color: #8A939E; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Leave Portal</p>
          </div>
          <!-- Body -->
          <div style="padding: 40px; color: #14181F;">
            <h2 style="font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Leave Request Update</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #555;">Hello ${employeeName},</p>
            <p style="font-size: 15px; line-height: 1.6; color: #555;">There has been an update regarding your recent leave application request.</p>
            
            <div style="background-color: #F4F6F8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1F7A8C;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #8A939E; width: 120px;">Leave Type:</td>
                  <td style="padding: 5px 0; font-weight: 600; color: #14181F;">${leaveTypeName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #8A939E;">Duration:</td>
                  <td style="padding: 5px 0; font-weight: 600; color: #14181F;">${fromDate} to ${toDate} (${leaveCount} day(s))</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #8A939E;">Status:</td>
                  <td style="padding: 5px 0;">
                    <span style="display: inline-block; background-color: ${statusBadgeColor}; color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px;">${statusText}</span>
                  </td>
                </tr>
                ${managerComment ? `
                <tr>
                  <td style="padding: 10px 0 5px 0; color: #8A939E; vertical-align: top;">Comment:</td>
                  <td style="padding: 10px 0 5px 0; font-style: italic; color: #14181F;">"${managerComment}"</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="font-size: 14px; line-height: 1.5; color: #555;">Log in to the Corvus Portal to view full analytics or history records.</p>
          </div>
          <!-- Footer -->
          <div style="background-color: #F4F6F8; padding: 20px; text-align: center; border-top: 1px solid #E8ECF0; font-size: 12px; color: #8A939E;">
            &copy; 2026 Corvus Studio. All rights reserved.
          </div>
        </div>
      </div>
    `,
  };

  return await getTransporter().sendMail(mailOptions);
};

/**
 * Send a notification regarding a newly submitted leave application
 * To: Nihar (nihar@thecorvusstudio.com)
 * CC: Raj, Yash, Soumya, Keshav, Aryan
 */
export const sendLeaveAppliedEmail = async (employeeName, leaveDetails) => {
  const { fromDate, toDate, leaveCount, leaveTypeName, reason, status } = leaveDetails;
  
  const mailOptions = {
    from: `"Corvus Studio Leave System" <${config.smtp.user || 'noreply@thecorvusstudio.com'}>`,
    to: 'nihar@thecorvusstudio.com',
    cc: [
      'raj@thecorvusstudio.com',
      'yash@thecorvusstudio.com',
      'soumya@thecorvusstudio.com',
      'keshav@thecorvusstudio.com',
      'aryan@thecorvusstudio.com'
    ],
    subject: `New Leave Request Filed: ${employeeName} - ${leaveTypeName}`,
    html: `
      <div style="background-color: #F4F6F8; padding: 40px; font-family: 'Inter', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #E8ECF0;">
          <!-- Header -->
          <div style="background-color: #0A0B0D; padding: 30px; text-align: center;">
            <h1 style="color: #2FB7C9; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 700;">CORVUS STUDIO</h1>
            <p style="color: #8A939E; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Leave Portal</p>
          </div>
          <!-- Body -->
          <div style="padding: 40px; color: #14181F;">
            <h2 style="font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">New Leave Application</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #555;">Hello Nihar,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #555;">A new leave application has been submitted by <strong>${employeeName}</strong> and requires your review.</p>
            
            <div style="background-color: #F4F6F8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1F7A8C;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #8A939E; width: 120px;">Employee:</td>
                  <td style="padding: 5px 0; font-weight: 600; color: #14181F;">${employeeName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #8A939E;">Leave Type:</td>
                  <td style="padding: 5px 0; font-weight: 600; color: #14181F;">${leaveTypeName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #8A939E;">Duration:</td>
                  <td style="padding: 5px 0; font-weight: 600; color: #14181F;">${fromDate} to ${toDate} (${leaveCount} day(s))</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #8A939E;">Status:</td>
                  <td style="padding: 5px 0;">
                    <span style="display: inline-block; background-color: ${status === 'pending_medical' ? '#3B82F6' : '#F59E0B'}; color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px;">${status === 'pending_medical' ? 'Pending Medical Document' : 'Pending Approval'}</span>
                  </td>
                </tr>
                ${reason ? `
                <tr>
                  <td style="padding: 10px 0 5px 0; color: #8A939E; vertical-align: top;">Reason:</td>
                  <td style="padding: 10px 0 5px 0; color: #14181F;">"${reason}"</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="font-size: 14px; line-height: 1.5; color: #555;">Please log in to the Corvus Portal to approve or reject this request.</p>
          </div>
          <!-- Footer -->
          <div style="background-color: #F4F6F8; padding: 20px; text-align: center; border-top: 1px solid #E8ECF0; font-size: 12px; color: #8A939E;">
            &copy; 2026 Corvus Studio. All rights reserved.
          </div>
        </div>
      </div>
    `,
  };

  return await getTransporter().sendMail(mailOptions);
};

