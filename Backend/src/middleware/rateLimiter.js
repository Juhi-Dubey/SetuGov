import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again later.'
    }
  }
});

export const invitationRateLimiter = rateLimit({
  windowMs: config.INVITATION_RATE_LIMIT_WINDOW_MS,
  max: config.INVITATION_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many invitation setup attempts. Please try again later.'
    }
  }
});

export const apiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX * 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again later.'
    }
  }
});

export const aiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'AI request limit reached. Please wait before issuing additional AI generation requests.'
    }
  }
});

export const accessRequestRateLimiter = rateLimit({
  windowMs: config.ACCESS_REQUEST_RATE_LIMIT_WINDOW_MS,
  max: config.ACCESS_REQUEST_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many access request submissions from this IP. Please try again later.'
    }
  }
});

export default {
  authRateLimiter,
  invitationRateLimiter,
  apiRateLimiter,
  aiRateLimiter,
  accessRequestRateLimiter
};

