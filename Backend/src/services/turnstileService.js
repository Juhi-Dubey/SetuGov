import { config } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';

const CLOUDFLARE_TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify Cloudflare Turnstile token on the backend
 * @param {string} token - Turnstile response token from frontend
 * @param {string|null} remoteIp - Optional client IP address
 * @param {string|null} expectedAction - Optional expected action name (e.g. government_access_request)
 * @returns {Promise<{ success: boolean, bypassed?: boolean, error?: { code: string, message: string } }>}
 */
export const verifyTurnstileToken = async (token, remoteIp = null, expectedAction = null) => {
  // If Turnstile is disabled (e.g. in local development / test mode), pass through safely
  if (!config.TURNSTILE_ENABLED) {
    return { success: true, bypassed: true };
  }

  // Non-production test bypass support
  if (config.NODE_ENV !== 'production' && (token === 'test_dummy_turnstile_pass' || token === 'XXXX.DUMMY.TOKEN.XXXX')) {
    return { success: true, bypassed: true };
  }

  // If enabled in production but secret key is not configured, fail safely
  if (!config.TURNSTILE_SECRET_KEY) {
    console.error('[SECURITY ERROR] TURNSTILE_ENABLED is true, but TURNSTILE_SECRET_KEY is missing from environment configuration.');
    return {
      success: false,
      error: {
        code: 'BOT_VERIFICATION_FAILED',
        message: 'Security verification configuration error. Please contact platform administrators.'
      }
    };
  }

  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      success: false,
      error: {
        code: 'BOT_VERIFICATION_FAILED',
        message: 'Bot verification token is required. Please complete verification.'
      }
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', config.TURNSTILE_SECRET_KEY);
    formData.append('response', token.trim());
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(CLOUDFLARE_TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      console.warn(`[TURNSTILE] Verification endpoint returned HTTP ${response.status}`);
      return {
        success: false,
        error: {
          code: 'BOT_VERIFICATION_FAILED',
          message: 'Bot verification failed. Please try again.'
        }
      };
    }

    const data = await response.json();
    if (data.success) {
      if (expectedAction) {
        if (!data.action || data.action !== expectedAction) {
          console.warn(`[TURNSTILE] Action mismatch or missing: expected "${expectedAction}", received "${data.action}"`);
          return {
            success: false,
            error: {
              code: 'BOT_VERIFICATION_FAILED',
              message: 'Bot verification action mismatch or missing action. Please try again.'
            }
          };
        }
      }
      return { success: true };
    }

    // Never log raw token or secret key
    console.warn('[TURNSTILE] Verification unsuccessful:', data['error-codes'] || 'unknown rejection');
    return {
      success: false,
      error: {
        code: 'BOT_VERIFICATION_FAILED',
        message: 'Bot verification failed. Please try again.'
      }
    };
  } catch (error) {
    console.error('[TURNSTILE] Verification network error:', error.message);
    return {
      success: false,
      error: {
        code: 'BOT_VERIFICATION_FAILED',
        message: 'Bot verification service is temporarily unavailable. Please try again later.'
      }
    };
  }
};

/**
 * Express middleware to enforce Turnstile verification on protected routes.
 * Supports both `requireTurnstile` directly or `requireTurnstile('action_name')`.
 */
export const requireTurnstile = (expectedActionOrReq, res, next) => {
  // If invoked as requireTurnstile('action_name') -> return middleware function
  if (typeof expectedActionOrReq === 'string') {
    const expectedAction = expectedActionOrReq;
    return async (req, res, next) => {
      if (!config.TURNSTILE_ENABLED) {
        return next();
      }
      const turnstileToken = req.body?.turnstileToken || req.headers['x-turnstile-token'];
      const ip = req.ip || req.headers['x-forwarded-for'] || null;
      const result = await verifyTurnstileToken(turnstileToken, ip, expectedAction);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || {
            code: 'BOT_VERIFICATION_FAILED',
            message: 'Bot verification failed. Please try again.'
          }
        });
      }
      next();
    };
  }

  // Standard middleware invocation (req, res, next)
  const req = expectedActionOrReq;
  if (!config.TURNSTILE_ENABLED) {
    return next();
  }

  const turnstileToken = req.body?.turnstileToken || req.headers['x-turnstile-token'];
  const ip = req.ip || req.headers['x-forwarded-for'] || null;

  verifyTurnstileToken(turnstileToken, ip).then((result) => {
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || {
          code: 'BOT_VERIFICATION_FAILED',
          message: 'Bot verification failed. Please try again.'
        }
      });
    }
    next();
  }).catch((err) => {
    next(err);
  });
};

export default {
  verifyTurnstileToken,
  requireTurnstile
};

