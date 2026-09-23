import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { isTokenRevoked } from '../utils/tokenRevocation.js';
import { UnauthorizedError, ForbiddenError, ServiceUnavailableError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {  
      token = authHeader.split(' ')[1];
    } else if (req.query?.token && typeof req.query.token === 'string') {
      const isDocumentRoute = 
        req.path.includes('/documents') ||
        req.path.includes('/uploads') ||
        req.path.includes('private');
        if (isDocumentRoute) {
          token = req.query.token;
        }
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token missing or invalid format.');
    }

    // Check if token has been explicitly revoked
    if (isTokenRevoked(token)) {
      throw new UnauthorizedError('Authentication token has been revoked. Please log in again.');
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid token payload.');
    }

    // Fetch user from database to ensure up-to-date role, department and active state
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department_id: true,
          is_active: true,
          is_verified: true,
          designation: true,
          created_at: true,
          updated_at: true,
          department: {
            select: {
              id: true,
              name: true,
              state: true,
              verification_status: true
            }
          },
          startups: {
            select: {
              id: true,
              company_name: true,
              verification_status: true,
              dpiit_number: true
            }
          },
          evaluator_profile: {
            select: {
              id: true,
              organization: true,
              designation: true,
              verification_status: true
            }
          }
        }
      });
    } catch (dbErr) {
      // Retry once if DB pooler connection was sleeping
      try {
        await new Promise((r) => setTimeout(r, 250));
        user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department_id: true,
            is_active: true,
            is_verified: true,
            designation: true,
            created_at: true,
            updated_at: true,
            department: {
              select: {
                id: true,
                name: true,
                state: true,
                verification_status: true
              }
            },
            startups: {
              select: {
                id: true,
                company_name: true,
                verification_status: true,
                dpiit_number: true
              }
            },
            evaluator_profile: {
              select: {
                id: true,
                organization: true,
                designation: true,
                verification_status: true
              }
            }
          }
        });
      } catch (retryErr) {
        logger.error(`Authentication database lookup failed for user ID ${decoded.userId}: ${retryErr.message}`);
        throw new ServiceUnavailableError('Authentication service is temporarily unavailable. Please try again.');
      }
    }

    if (!user) {
      throw new UnauthorizedError('User account associated with this token no longer exists.');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('User account has been deactivated. Please contact an administrator.');
    }

    // Attach verified user and active startup context (if startup role) to request
    req.user = user;
    req.startup = user.startups && user.startups.length > 0 ? user.startups[0] : null;

    // Development diagnostic logging
    if (config.NODE_ENV !== 'production') {
      logger.info(`[AUTH DEBUG] authenticated user id: ${user.id}`);
      logger.info(`[AUTH DEBUG] authenticated user role: ${user.role}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // const queryToken = req.query?.token;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticate(req, res, next);
};

export default authenticate;
