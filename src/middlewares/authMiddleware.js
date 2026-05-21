import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/index.js';
import { isTokenBlacklisted } from '../config/redis.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('You are not logged in. Please authenticate.');
    }

    // Check token blacklist in Redis
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw new UnauthorizedError('Your session has expired. Please log in again.');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      throw new UnauthorizedError('Invalid access token. Please re-authenticate.');
    }

    // Verify user still exists and is active
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('The employee account associated with this token no longer exists.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Your employee account has been deactivated.');
    }

    // Grant access to route
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    next();
  };
};
