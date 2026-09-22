import crypto from 'crypto';
import { config } from '../config/env.js';
import { logger } from './logger.js';

// Derive 32-byte key from environment secret
const getKey = () => {
  const secret = process.env.BANK_ENCRYPTION_KEY || config.JWT_SECRET;
  if (!secret) {
    if (config.NODE_ENV === 'production') {
      throw new Error('FATAL: BANK_ENCRYPTION_KEY or JWT_SECRET must be configured in production.');
    }
    return crypto.createHash('sha256').update('setugov-dev-fallback-key-for-bank').digest();
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypt sensitive string data using AES-256-GCM
 * @param {string} text
 * @returns {string} Encrypted format "enc:gcm:iv:authTag:ciphertext"
 */
export const encryptString = (text) => {
  if (!text) return text;
  const str = String(text).trim();
  if (str.startsWith('enc:gcm:')) {
    return str; // Already encrypted
  }

  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(str, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `enc:gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    logger.error(`[ENCRYPTION_FAILURE] Error encrypting data: ${error.message}`);
    throw new Error('Cryptographic encryption failed.');
  }
};

/**
 * Decrypt AES-256-GCM encrypted string
 * @param {string} encryptedText
 * @returns {string} Plaintext
 */
export const decryptString = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  const str = String(encryptedText).trim();
  if (!str.startsWith('enc:gcm:')) {
    return str; // Legacy or unencrypted string
  }

  try {
    const parts = str.split(':');
    if (parts.length !== 5) {
      return str;
    }

    const [, , ivHex, tagHex, cipherHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error(`[DECRYPTION_FAILURE] Error decrypting data: ${error.message}`);
    return '****'; // Fallback safe mask on corruption
  }
};

/**
 * Check if string is an AES-256-GCM ciphertext
 * @param {string} text
 * @returns {boolean}
 */
export const isEncrypted = (text) => {
  if (!text || typeof text !== 'string') return false;
  return text.startsWith('enc:gcm:');
};

/**
 * Mask account number for safe public and operational display
 * Never reveals more than last 4 digits
 * @param {string} accountNumber
 * @returns {string}
 */
export const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return null;
  const raw = decryptString(accountNumber);
  const str = String(raw).trim();
  if (str.length <= 4) return str;
  return '****' + str.slice(-4);
};

export default {
  encryptString,
  decryptString,
  isEncrypted,
  maskAccountNumber
};
