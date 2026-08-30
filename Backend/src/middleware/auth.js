import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid format.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing.');
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid token payload.');
    }

    // Fetch user from database to ensure up-to-date role, department and active state
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        department: {
          select: {
            id: true,
            name: true,
            state: true
          }
        },
        startups: {
          select: {
            id: true,
            company_name: true,
            verification_status: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedError('User account associated with this token no longer exists.');
    }

    if (!user.is_active) {
      throw new ForbiddenError('User account has been deactivated. Please contact an administrator.');
    }

    // Attach verified user and active startup context (if startup role) to request
    req.user = user;
    req.startup = user.startups && user.startups.length > 0 ? user.startups[0] : null;

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
