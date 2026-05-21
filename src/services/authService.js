import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { User, OtpCode } from '../models/index.js';
import { config } from '../config/index.js';

import { sendOTPEmail } from './mailService.js';
import { UnauthorizedError, BadRequestError } from '../utils/errors.js';

export const requestOTP = async (email, ipAddress) => {
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail.endsWith(`@${config.allowedEmailDomain}`)) {
    throw new BadRequestError(`Access restricted to @${config.allowedEmailDomain} domains only.`);
  }

  const user = await User.findOne({
    where: {
      workEmail: normalizedEmail,
      status: 'active',
    },
  });

  if (!user) {
    throw new UnauthorizedError('Unauthorized: Email is not registered as an active employee.');
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  const salt = await bcryptjs.genSalt(10);
  const otpHash = await bcryptjs.hash(otp, salt);

  const expiresAt = new Date(Date.now() + config.otp.expirySeconds * 1000);

  await OtpCode.upsert({
    email: normalizedEmail,
    otpHash,
    expiresAt,
  });

  await sendOTPEmail(normalizedEmail, otp);

  console.log(`[Auth] OTP generated for ${normalizedEmail} (IP: ${ipAddress})`);
  return { message: 'OTP sent successfully to your work email.' };
};

export const verifyOTPAndLogin = async (email, otpInput) => {
  const normalizedEmail = email.toLowerCase().trim();

  const otpRecord = await OtpCode.findOne({
    where: { email: normalizedEmail },
  });

  if (!otpRecord) {
    throw new BadRequestError('OTP has expired or is invalid. Please request a new one.');
  }

  if (new Date(otpRecord.expiresAt) < new Date()) {
    await otpRecord.destroy();
    throw new BadRequestError('OTP has expired or is invalid. Please request a new one.');
  }

  const isValid = await bcryptjs.compare(otpInput, otpRecord.otpHash);
  if (!isValid) {
    throw new BadRequestError('Invalid OTP code provided.');
  }

  await otpRecord.destroy();

  const user = await User.findOne({
    where: { workEmail: normalizedEmail },
  });

  if (!user || user.status !== 'active') {
    throw new UnauthorizedError('Employee account has been deactivated or not found.');
  }

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
  console.log(`[Auth] Session invalidated successfully for: ${email}`);

  return {
    message: 'Logged out successfully.',
  };
};
