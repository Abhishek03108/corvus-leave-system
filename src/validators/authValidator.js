import Joi from 'joi';
import { config } from '../config/index.js';
import { BadRequestError } from '../utils/errors.js';

const emailDomainRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@${config.allowedEmailDomain.replace('.', '\\.')}$`);

export const validateRequestOTP = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .pattern(emailDomainRegex)
      .required()
      .messages({
        'string.empty': 'Email field cannot be empty.',
        'string.email': 'Please enter a valid email address.',
        'string.pattern.base': `Access is restricted to official @${config.allowedEmailDomain} domains only.`,
        'any.required': 'Email is a required field.',
      }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new BadRequestError(error.details[0].message));
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .pattern(emailDomainRegex)
      .required()
      .messages({
        'string.empty': 'Email field cannot be empty.',
        'string.email': 'Please enter a valid email address.',
        'string.pattern.base': `Access is restricted to official @${config.allowedEmailDomain} domains only.`,
        'any.required': 'Email is a required field.',
      }),
    otp: Joi.string()
      .length(config.otp.length)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.empty': 'OTP code cannot be empty.',
        'string.length': `OTP must be exactly ${config.otp.length} digits.`,
        'string.pattern.base': 'OTP must contain numeric digits only.',
        'any.required': 'OTP is a required field.',
      }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new BadRequestError(error.details[0].message));
  }
  next();
};
