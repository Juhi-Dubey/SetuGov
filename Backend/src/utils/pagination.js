import { BadRequestError } from './errors.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Validates and normalizes pagination query parameters (page, limit / pageSize).
 *
 * Validation rules:
 * - page: Must be a positive integer >= 1. Defaults to 1 if omitted or empty.
 *         Rejects 0, negative numbers, decimals, non-digit strings, arrays, objects, NaN, and Infinity.
 * - limit: Must be a positive integer >= 1. Defaults to 20 if omitted or empty.
 *          Rejects 0, negative numbers, decimals, non-digit strings, arrays, objects, NaN, and Infinity.
 *          Strictly capped at MAX_PAGE_SIZE (100) to prevent database resource exhaustion.
 *
 * @param {object} query - Query parameters object (e.g., req.query)
 * @param {object} [options]
 * @param {number} [options.defaultLimit=20]
 * @param {number} [options.maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
export const parsePaginationParams = (query = {}, options = {}) => {
  const defaultLimit = options.defaultLimit || DEFAULT_PAGE_SIZE;
  const maxLimit = options.maxLimit || MAX_PAGE_SIZE;

  const rawPage = query.page !== undefined ? query.page : query.currentPage;
  const rawLimit = query.limit !== undefined ? query.limit : query.pageSize;

  let page = 1;
  let limit = defaultLimit;

  // 1. Validate 'page'
  if (rawPage !== undefined && rawPage !== null && rawPage !== '') {
    if (typeof rawPage === 'object') {
      throw new BadRequestError('Page parameter must be a single positive integer.');
    }

    const strPage = String(rawPage).trim();
    if (!/^\d+$/.test(strPage)) {
      throw new BadRequestError('Page must be a positive integer greater than or equal to 1.');
    }

    const numPage = Number(strPage);
    if (!Number.isInteger(numPage) || numPage < 1 || !Number.isFinite(numPage)) {
      throw new BadRequestError('Page must be a positive integer greater than or equal to 1.');
    }

    page = numPage;
  }

  // 2. Validate 'limit'
  if (rawLimit !== undefined && rawLimit !== null && rawLimit !== '') {
    if (typeof rawLimit === 'object') {
      throw new BadRequestError('Limit parameter must be a single positive integer.');
    }

    const strLimit = String(rawLimit).trim();
    if (!/^\d+$/.test(strLimit)) {
      throw new BadRequestError('Limit must be a positive integer greater than or equal to 1.');
    }

    const numLimit = Number(strLimit);
    if (!Number.isInteger(numLimit) || numLimit < 1 || !Number.isFinite(numLimit)) {
      throw new BadRequestError('Limit must be a positive integer greater than or equal to 1.');
    }

    // Server-side ceiling: strictly cap at maxLimit regardless of client-requested size
    limit = Math.min(numLimit, maxLimit);
  }

  const skip = (page - 1) * limit;
  const take = limit;

  return {
    page,
    limit,
    skip,
    take
  };
};

export default {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePaginationParams
};
