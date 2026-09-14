import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Clean Verification Abstraction for SetuGov GeM-Style Startup Onboarding
 * 
 * Supports:
 * - 'DOCUMENT_VERIFIED' (Current baseline: format validation + private document evidence + admin review)
 * - Future 'EXTERNAL_API_VERIFIED' (PAN / MCA / GST / DPIIT / Bank Penny Drop API connectors)
 * 
 * Note: Never fabricates or fakes live government API calls.
 */

// Regex patterns for standard Indian business identity numbers
export const PATTERNS = {
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  CIN: /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/,
  LLPIN: /^[A-Z]{3}-[0-9]{4}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  PINCODE: /^[1-9][0-9]{5}$/
};

/**
 * Validate and verify Permanent Account Number (PAN)
 * 
 * @param {string} panNumber 
 * @param {string} legalName 
 * @returns {object}
 */
export const verifyPan = async (panNumber, legalName) => {
  if (!panNumber || typeof panNumber !== 'string') {
    return { isValid: false, reason: 'PAN is required' };
  }
  const normalized = panNumber.trim().toUpperCase();
  const formatValid = PATTERNS.PAN.test(normalized);

  if (!formatValid) {
    return {
      isValid: false,
      reason: 'Invalid PAN format. Must be 10 characters alphanumeric (e.g. ABCDE1234F).'
    };
  }

  // Current baseline: Document Verification & Administrative Review
  return {
    isValid: true,
    panNumber: normalized,
    source: 'DOCUMENT_VERIFIED',
    status: 'PENDING_ADMIN_REVIEW',
    message: 'PAN format verified. Administrative document evidence verification required.'
  };
};

/**
 * Validate and verify Goods and Services Tax Identification Number (GSTIN)
 * 
 * @param {string} gstin 
 * @param {string} legalName 
 * @returns {object}
 */
export const verifyGstin = async (gstin, legalName) => {
  if (!gstin) return { isValid: true, skipped: true };
  const normalized = gstin.trim().toUpperCase();
  const formatValid = PATTERNS.GSTIN.test(normalized);

  if (!formatValid) {
    return {
      isValid: false,
      reason: 'Invalid GSTIN format. Must be 15 characters (e.g. 29ABCDE1234F1Z5).'
    };
  }

  return {
    isValid: true,
    gstin: normalized,
    source: 'DOCUMENT_VERIFIED',
    status: 'PENDING_ADMIN_REVIEW',
    message: 'GSTIN format verified. Administrative document evidence verification required.'
  };
};

/**
 * Validate and verify Corporate Identification Number (CIN)
 * 
 * @param {string} cinNumber 
 * @param {string} legalName 
 * @returns {object}
 */
export const verifyCin = async (cinNumber, legalName) => {
  if (!cinNumber) return { isValid: true, skipped: true };
  const normalized = cinNumber.trim().toUpperCase();
  const formatValid = PATTERNS.CIN.test(normalized);

  if (!formatValid) {
    return {
      isValid: false,
      reason: 'Invalid CIN format. Must be 21 characters (e.g. U72900KA2023PTC123456).'
    };
  }

  return {
    isValid: true,
    cinNumber: normalized,
    source: 'DOCUMENT_VERIFIED',
    status: 'PENDING_ADMIN_REVIEW',
    message: 'CIN format verified. Administrative document evidence verification required.'
  };
};

/**
 * Validate and verify Bank Account & IFSC
 * 
 * @param {object} bankDetails
 * @returns {object}
 */
export const verifyBankDetails = async ({ accountNumber, ifscCode, accountHolderName, bankName }) => {
  if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
    return { isValid: false, reason: 'All bank details fields are required.' };
  }

  const normalizedIfsc = ifscCode.trim().toUpperCase();
  const normalizedAcc = accountNumber.trim();

  if (!PATTERNS.IFSC.test(normalizedIfsc)) {
    return { isValid: false, reason: 'Invalid IFSC code format (e.g. SBIN0001234).' };
  }

  if (!/^\d{9,18}$/.test(normalizedAcc)) {
    return { isValid: false, reason: 'Account number must be between 9 and 18 digits.' };
  }

  return {
    isValid: true,
    source: 'DOCUMENT_VERIFIED',
    status: 'PENDING_ADMIN_REVIEW',
    message: 'Bank format verified. Canceled cheque / passbook verification required.'
  };
};

export default {
  PATTERNS,
  verifyPan,
  verifyGstin,
  verifyCin,
  verifyBankDetails
};
