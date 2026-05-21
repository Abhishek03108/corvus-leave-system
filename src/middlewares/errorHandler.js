import { config } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.isProduction) {
    // Production: Don't leak details
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // Unhandled / Programming / DB system errors
    console.error('[Centralized Error Handler] ERROR 💥:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong on our end.',
    });
  } else {
    // Development: detailed information
    console.error('[Centralized Error Handler] Debug Error:', err);
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }
};
