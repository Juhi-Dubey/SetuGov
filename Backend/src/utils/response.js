/**
 * Standard API Success Response
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} message
 * @param {number} statusCode
 */
export const successResponse = (res, data = {}, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

/**
 * Standard API Error Response
 * @param {import('express').Response} res
 * @param {string} code
 * @param {string} message
 * @param {any} details
 * @param {number} statusCode
 */
export const errorResponse = (res, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
};

export default {
  successResponse,
  errorResponse
};
