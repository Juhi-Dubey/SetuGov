import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required prior to authorization check.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: required role [${allowedRoles.join(', ')}], current role is [${req.user.role}].`
        )
      );
    }

    next();
  };
};

export default authorizeRoles;
