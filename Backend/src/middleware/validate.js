import { BadRequestError } from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generic Zod Request Validation Middleware
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validates that specified URL parameters match UUID v4 format
 * @param  {...string} paramNames
 */
export const validateUuidParams = (...paramNames) => {
  return (req, res, next) => {
    for (const name of paramNames) {
      const val = req.params[name];
      if (val && !UUID_REGEX.test(val)) {
        return next(new BadRequestError(`Invalid UUID format for parameter '${name}': '${val}'`));
      }
    }
    next();
  };
};

export default {
  validate,
  validateUuidParams
};
