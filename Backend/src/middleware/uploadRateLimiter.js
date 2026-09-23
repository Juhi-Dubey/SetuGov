import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const shouldSkipRateLimit = (req) => {
  if (config.NODE_ENV === 'test') return true;

  if (
    config.NODE_ENV !== 'production' &&
    req.headers['x-bypass-rate-limit'] === 'test-bypass'
  ) {
    return true;
  }

  return false;
};

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many upload attempts. Please try again later.'
    }
  }
});

export default uploadRateLimiter;