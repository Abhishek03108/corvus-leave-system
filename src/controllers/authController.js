import * as authService from '../services/authService.js';
import { config } from '../config/index.js';

export const requestOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip;
    const result = await authService.requestOTP(email, ipAddress);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const { user, accessToken, refreshToken } = await authService.verifyOTPAndLogin(email, otp);

    // Secure Cookie Storage for Refresh Token
    res.cookie('refreshToken', refreshToken, {
      ...config.cookie,
    });

    return res.status(200).json({
      status: 'success',
      accessToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ status: 'fail', message: 'No refresh token provided.' });
    }

    const { accessToken } = await authService.refreshSession(token);
    return res.status(200).json({
      status: 'success',
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const refreshToken = req.cookies.refreshToken;
    const email = req.user?.email || 'unknown';

    await authService.logoutSession(accessToken, refreshToken, email);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      status: 'success',
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};
