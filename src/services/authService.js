import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { User } from '../models/index.js';
import { config } from '../config/index.js';
import { setOTP, getOTP, deleteOTP, blacklistToken } from '../config/redis.js';
import { sendOTPEmail } from './mailService.js';
import { UnauthorizedError, BadRequestError } from '../utils/errors.js';

export const requestOTP = async (email, ipAddress) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Enforce studio domain
  if (!normalizedEmail.endsWith(`@${config.allowedEmailDomain}`)) {
    throw new BadRequestError(`Access restricted to @${config.allowedEmailDomain} domains only.`);
  }

  // Verify employee exists in DB (Must match registered active staff)
  const user = await User.findOne({
    where: {
      workEmail: normalizedEmail,
      status: 'active',
    },
  });

  if (!user) {
    throw new UnauthorizedError('Unauthorized: Email is not registered as an active employee.');
  }

  // Generate 6 digit secure random OTP
  let otp = crypto.randomInt(100000, 999999).toString();
  
  // Temporary override until domain is connected
  otp = '123456';
  console.log('[Auth] Temporarily overriding OTP to 123456 until domain is connected.');

  // Hash OTP for secure comparison
  const salt = await bcryptjs.genSalt(10);
  const otpHash = await bcryptjs.hash(otp, salt);

  // Save hashed OTP in Redis with 5 min TTL
  await setOTP(normalizedEmail, otpHash, config.otp.expirySeconds);

  // Send Email (Supports mock transport gracefully)
  await sendOTPEmail(normalizedEmail, otp);
  
  console.log(`[Auth] OTP generated for ${normalizedEmail} (IP: ${ipAddress})`);
  return { message: 'OTP sent successfully to your work email.' };
};

export const verifyOTPAndLogin = async (email, otpInput) => {
  const normalizedEmail = email.toLowerCase().trim();

  const hashedOTP = await getOTP(normalizedEmail);
  if (!hashedOTP) {
    throw new BadRequestError('OTP has expired or is invalid. Please request a new one.');
  }

  // Verify input against stored hash
  const isValid = await bcryptjs.compare(otpInput, hashedOTP);
  if (!isValid) {
    throw new BadRequestError('Invalid OTP code provided.');
  }

  // Delete OTP upon successful match (one-time usage rule)
  await deleteOTP(normalizedEmail);

  // Fetch full user details
  const user = await User.findOne({
    where: { workEmail: normalizedEmail },
  });

  if (!user || user.status !== 'active') {
    throw new UnauthorizedError('Employee account has been deactivated or not found.');
  }

  // Generate Session Tokens
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, email: user.workEmail },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      workEmail: user.workEmail,
      role: user.role,
      designation: user.designation,
      department: user.department,
      profileImage: user.profileImage,
      joiningDate: user.joiningDate,
      contactNumber: user.contactNumber,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshSession = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('Unauthorized: Active user account not found.');
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.workEmail },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return { accessToken };
  } catch (error) {
    throw new UnauthorizedError('Session expired. Please log in again.');
  }
};

export const logoutSession = async (accessToken, refreshToken, email) => {
  // Invalidating tokens by blacklisting
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      if (decoded && decoded.exp) {
        const timeRemaining = decoded.exp - Math.floor(Date.now() / 1000);
        if (timeRemaining > 0) {
          await blacklistToken(accessToken, timeRemaining);
        }
      }
    } catch (err) {
      console.error('[Auth] Failed to blacklist access token:', err);
    }
  }

  console.log(`[Auth] Session invalidated successfully for: ${email}`);
  return { message: 'Logged out successfully.' };
};
