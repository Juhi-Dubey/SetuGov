import path from 'path';
import fs from 'fs';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

let activeProvider = new LocalStorageProvider();

/**
 * Configure or swap the active storage provider (e.g. for testing or future S3 adapter)
 * @param {import('./BaseStorageProvider').BaseStorageProvider} provider
 */
export const setStorageProvider = (provider) => {
  if (!provider) {
    throw new Error('Storage provider cannot be null');
  }
  activeProvider = provider;
};

/**
 * Get the currently active storage provider
 * @returns {import('./BaseStorageProvider').BaseStorageProvider}
 */
export const getStorageProvider = () => {
  return activeProvider;
};

/**
 * Reset storage provider back to the default LocalStorageProvider
 */
export const resetStorageProvider = () => {
  activeProvider = new LocalStorageProvider();
};

/**
 * Cleanly sanitize an arbitrary key/path to prevent path traversal
 * @param {string} rawKey
 * @returns {string} Sanitized base filename
 */
export const sanitizeStorageKey = (rawKey) => {
  if (!rawKey || typeof rawKey !== 'string') {
    throw new BadRequestError('Invalid file identifier specified.');
  }

  const cleaned = rawKey.replace(/\0/g, '').trim();
  if (cleaned.includes('..') || cleaned.includes('/') || cleaned.includes('\\')) {
    // If the input is a path or traversal, check if it's attempting traversal
    if (cleaned.includes('..')) {
      throw new BadRequestError('Invalid document path specified.');
    }
  }

  const base = path.basename(cleaned);

  if (!base || base === '.' || base === '..' || base.includes('..') || base.includes('/') || base.includes('\\')) {
    throw new BadRequestError('Invalid document path specified.');
  }

  return base;
};

/**
 * Extract clean storage key from a full document URL or path
 * e.g. "/api/v1/documents/abc.pdf" -> "abc.pdf"
 *      "http://localhost:5000/api/v1/documents/abc.pdf" -> "abc.pdf"
 * @param {string} urlOrPath
 * @returns {string} Clean storage key
 */
export const extractKeyFromUrl = (urlOrPath) => {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  try {
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      const parsed = new URL(urlOrPath);
      return sanitizeStorageKey(path.basename(parsed.pathname));
    }
    return sanitizeStorageKey(path.basename(urlOrPath));
  } catch (err) {
    return sanitizeStorageKey(path.basename(urlOrPath));
  }
};

/**
 * Persist a file into storage
 */
export const saveFile = async (sourcePath, key, options = {}) => {
  const safeKey = sanitizeStorageKey(key);
  return activeProvider.saveFile(sourcePath, safeKey, options);
};

/**
 * Persist a buffer into storage
 */
export const saveBuffer = async (key, buffer, options = {}) => {
  const safeKey = sanitizeStorageKey(key);
  return activeProvider.saveBuffer(safeKey, buffer, options);
};

/**
 * Check if a file exists in storage
 */
export const fileExists = async (key) => {
  try {
    const safeKey = sanitizeStorageKey(key);
    return await activeProvider.fileExists(safeKey);
  } catch (err) {
    if (err instanceof BadRequestError) return false;
    throw err;
  }
};

/**
 * Open a readable stream for a stored file
 */
export const getFileStream = async (key) => {
  const safeKey = sanitizeStorageKey(key);
  return activeProvider.getFileStream(safeKey);
};

/**
 * Delete a file from storage safely and idempotently
 */
export const deleteFile = async (key) => {
  try {
    const safeKey = sanitizeStorageKey(key);
    return await activeProvider.deleteFile(safeKey);
  } catch (err) {
    if (err instanceof BadRequestError) return false;
    logger.warn(`Failed to delete stored file [${key}]:`, err.message);
    return false;
  }
};

/**
 * Retrieve metadata for a stored file
 */
export const getFileMetadata = async (key) => {
  try {
    const safeKey = sanitizeStorageKey(key);
    return await activeProvider.getFileMetadata(safeKey);
  } catch (err) {
    if (err instanceof BadRequestError) return null;
    throw err;
  }
};

/**
 * Safely delete a temporary file on the local filesystem
 * @param {string} tempPath
 */
export const deleteTempFile = (tempPath) => {
  if (!tempPath || typeof tempPath !== 'string') return;
  try {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  } catch (err) {
    logger.warn(`Failed to delete temp file [${tempPath}]:`, err.message);
  }
};

/**
 * Get base directory for local storage (used by multer for initial staging)
 */
export const getLocalStorageDir = () => {
  if (typeof activeProvider.getBaseDir === 'function') {
    return activeProvider.getBaseDir();
  }
  return path.resolve(process.cwd(), 'uploads');
};

export default {
  setStorageProvider,
  getStorageProvider,
  resetStorageProvider,
  sanitizeStorageKey,
  extractKeyFromUrl,
  saveFile,
  saveBuffer,
  fileExists,
  getFileStream,
  deleteFile,
  getFileMetadata,
  deleteTempFile,
  getLocalStorageDir
};
