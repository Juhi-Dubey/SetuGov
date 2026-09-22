import { ZodError } from 'zod';
import { Prisma } from '../generated/client/index.js';
import { AppError } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  if (err.statusCode && err.statusCode < 500) {
    logger.warn(`${req.method} ${req.originalUrl} - ${err.statusCode} ${err.message}`);
  } else {
    logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
      stack: err.stack,
      details: err.details
    });
  }

  // Handle Known AppError
  if (err instanceof AppError) {
    return errorResponse(res, err.code, err.message, err.details, err.statusCode);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }));
    return errorResponse(res, 'VALIDATION_ERROR', 'Request validation failed', formattedErrors, 422);
  }

  // Helper to sanitize error details and prevent internal database/system leakage
  const sanitizeMeta = (meta) => {
    if (!meta || typeof meta !== 'object') return null;
    const { driverAdapterError, database, clientVersion, ...safeMeta } = meta;
    return Object.keys(safeMeta).length > 0 ? safeMeta : null;
  };

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      return errorResponse(
        res,
        'DUPLICATE_RESOURCE',
        `A record with this ${target} already exists.`,
        sanitizeMeta(err.meta),
        409
      );
    }
    if (err.code === 'P2025') {
      return errorResponse(res, 'NOT_FOUND', 'Requested record does not exist.', null, 404);
    }
    if (err.code === 'P2003') {
      return errorResponse(
        res,
        'FOREIGN_KEY_VIOLATION',
        'Referenced related resource does not exist.',
        sanitizeMeta(err.meta),
        400
      );
    }
    if (err.code === 'P2023') {
      return errorResponse(
        res,
        'BAD_REQUEST',
        'Inconsistent or invalid column data provided.',
        null,
        400
      );
    }
  }

  // Handle Prisma Validation Errors (e.g. malformed UUID or query arguments)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return errorResponse(res, 'BAD_REQUEST', 'Invalid request parameter or schema data.', null, 400);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'INVALID_TOKEN', 'Invalid authentication token.', null, 401);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'TOKEN_EXPIRED', 'Authentication token has expired.', null, 401);
  }

  // Handle Body-Parser JSON Syntax Errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'INVALID_JSON', 'Malformed JSON payload.', null, 400);
  }

  // Generic Internal Server Error: Never leak stack traces, database credentials, or internal paths
  const isProduction = process.env.NODE_ENV === 'production';
  const rawMsg = String(err.message || '');
  const containsSensitiveInfo = /password|secret|jwt|database_url|postgres:\/\/|bearer|token/i.test(rawMsg);

  const message = isProduction || containsSensitiveInfo
    ? 'An unexpected internal server error occurred.'
    : (rawMsg || 'Internal server error');

  return errorResponse(res, 'INTERNAL_SERVER_ERROR', message, null, 500);
};

export default errorHandler;
