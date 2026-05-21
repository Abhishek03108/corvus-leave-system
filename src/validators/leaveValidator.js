import Joi from 'joi';
import { BadRequestError } from '../utils/errors.js';

export const validateApplyLeave = (req, res, next) => {
  const schema = Joi.object({
    leaveTypeId: Joi.string().uuid().required().messages({
      'string.empty': 'Please select a leave type.',
      'any.required': 'Leave type is a required field.',
    }),
    fromDate: Joi.date().iso().required().messages({
      'date.format': 'Start date must be a valid ISO format date.',
      'any.required': 'Start date is a required field.',
    }),
    toDate: Joi.date().iso().min(Joi.ref('fromDate')).required().messages({
      'date.format': 'End date must be a valid ISO format date.',
      'date.min': 'End date cannot be prior to start date.',
      'any.required': 'End date is a required field.',
    }),
    isHalfDay: Joi.boolean().default(false),
    reason: Joi.string().trim().min(5).max(1000).required().messages({
      'string.empty': 'Please provide a reason for the leave.',
      'string.min': 'Reason must be at least 5 characters long.',
      'any.required': 'Reason is a required field.',
    }),
    medicalDocumentPath: Joi.string().uri().pattern(/\.(pdf|jpg|jpeg|png)$/i).allow(null, '').optional().messages({
      'string.pattern.base': 'Medical document URL must end with .pdf, .jpg, .jpeg, or .png',
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new BadRequestError(error.details[0].message));
  }
  next();
};

export const validateUpdateStatus = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'pending_medical').required().messages({
      'any.only': 'Status must be one of: approved, rejected, pending_medical.',
      'any.required': 'Status update target is required.',
    }),
    managerComment: Joi.string().trim().max(1000).allow(null, '').optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new BadRequestError(error.details[0].message));
  }
  next();
};

export const validateMedicalDocument = (req, res, next) => {
  const schema = Joi.object({
    medicalDocumentPath: Joi.string().uri().pattern(/\.(pdf|jpg|jpeg|png)$/i).required().messages({
      'string.pattern.base': 'Medical document URL must end with .pdf, .jpg, .jpeg, or .png',
      'any.required': 'Medical document URL is required.',
      'string.empty': 'Medical document URL cannot be empty.',
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(new BadRequestError(error.details[0].message));
  }
  next();
};
