import path from 'path';
import fs from 'fs';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { BadRequestError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

let activeProvider = new LocalStorageProvider();

/**
 * Configure or swap the active storage provider (e.g. for testing or future S3 adapter)
 * @param {import('./BaseStorageProvider.js').BaseStorageProvider} provider
 */
export const setStorageProvider = (provider) => {
  if (!provider) {
    throw new Error('Storage provider cannot be null');
  }
  activeProvider = provider;
};

/**
 * Get the currently active storage provider
 * @returns {import('./BaseStorageProvider.js').BaseStorageProvider}
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
 * Validate that a document reference (URL, relative path, or filename) resolves
 * strictly within the authorized platform storage and points to an actual physical file.
 *
 * Prevents:
 *  - Directory traversal sequences (../, ..\, %2e%2e, etc.)
 *  - Absolute filesystem paths (C:\..., /etc/passwd, etc.)
 *  - Arbitrary external URLs (only permitted local hostnames or setugov domain)
 *  - Paths outside the configured storage directory
 *  - Missing / non-existent physical files
 *
 * @param {string} urlOrPath - The document URL, path, or filename to verify
 * @param {object} [options]
 * @returns {Promise<{ key: string, normalizedUrl: string, metadata: { key: string, size: number, modifiedAt: Date } | null }>}
 */
export const verifyDocumentFile = async (urlOrPath, options = {}) => {
  if (!urlOrPath || typeof urlOrPath !== 'string') {
    throw new BadRequestError('Document file reference is required.');
  }

  let cleaned = urlOrPath.replace(/\0/g, '').trim();

  // Try decoding in case of URL encoded traversal sequences
  try {
    const decoded = decodeURIComponent(cleaned);
    if (decoded !== cleaned) {
      if (decoded.includes('..') || decoded.includes('\\') || decoded.includes('\0')) {
        throw new BadRequestError('Invalid document path specified: Directory traversal sequences are forbidden.');
      }
    }
  } catch (e) {
    if (e instanceof BadRequestError) throw e;
  }

  // 1. Prevent traversal sequences
  if (cleaned.includes('..') || cleaned.includes('\\') || cleaned.includes('\0')) {
    throw new BadRequestError('Invalid document path specified: Directory traversal sequences are forbidden.');
  }

  // 2. Prevent Windows drive letters or rooted paths (e.g. C:\ or D:/)
  if (/^[a-zA-Z]:/.test(cleaned)) {
    throw new BadRequestError('Invalid document path: Absolute filesystem paths are forbidden.');
  }

  // 3. Handle external schemes and URLs
  let pathname = cleaned;

  // 3a. Block dangerous pseudo-protocols (XSS, SSRF, local file access)
  // These do NOT contain '://' so must be checked explicitly before URL parsing
  const DANGEROUS_SCHEMES = ['javascript:', 'vbscript:', 'data:', 'file:', 'ftp:', 'ftps:', 'blob:', 'about:', 'ws:', 'wss:'];
  const lowerCleaned = cleaned.toLowerCase();
  if (DANGEROUS_SCHEMES.some(scheme => lowerCleaned.startsWith(scheme))) {
    throw new BadRequestError('Invalid document reference: Dangerous URL scheme is not permitted.');
  }

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const parsed = new URL(cleaned);
      const allowedHosts = ['localhost', '127.0.0.1', 'setugov.in', 'storage.setugov.in', 'storage.setugov.gov.in'];
      const isAllowedHost = allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
      if (!isAllowedHost) {
        throw new BadRequestError('Invalid document URL: External URLs are not permitted.');
      }
      pathname = parsed.pathname;
    } catch (urlErr) {
      if (urlErr instanceof BadRequestError) throw urlErr;
      throw new BadRequestError('Invalid document URL format.');
    }
  } else if (cleaned.includes('://') || cleaned.startsWith('//')) {
    // Catch-all for other scheme://host patterns not already blocked above
    throw new BadRequestError('Invalid document reference scheme.');
  }

  // Strip query string and fragment
  pathname = pathname.split('?')[0].split('#')[0];

  // 4. Validate directory containment if path contains slashes
  if (pathname.startsWith('/')) {
    const allowedPrefixes = ['/api/v1/documents/', '/uploads/', '/api/v1/uploads/', '/docs/'];
    const isAllowedPrefix = allowedPrefixes.some(prefix => pathname.startsWith(prefix));
    if (!isAllowedPrefix) {
      throw new BadRequestError('Invalid document path: Path is outside the configured storage directory.');
    }
  } else if (pathname.includes('/')) {
    // Relative path with subdirectories not matching allowed prefix
    throw new BadRequestError('Invalid document path: Relative nested paths outside storage are forbidden.');
  }

  // 5. Extract storage key (base filename)
  const key = extractKeyFromUrl(pathname);
  if (!key || key === '.' || key === '..') {
    throw new BadRequestError('Unable to resolve a valid storage key from the document reference.');
  }

  // 6. Verify physical file exists in storage provider
  const exists = await fileExists(key);
  if (!exists) {
    throw new BadRequestError(`Referenced physical document file does not exist in storage: '${key}'. Please upload the document first.`);
  }

  // 7. Retrieve physical file metadata if supported
  const metadata = await getFileMetadata(key);

  const normalizedUrl = `/api/v1/documents/${key}`;

  return {
    key,
    normalizedUrl,
    metadata
  };
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
  verifyDocumentFile,
  saveFile,
  saveBuffer,
  fileExists,
  getFileStream,
  deleteFile,
  getFileMetadata,
  deleteTempFile,
  getLocalStorageDir
};

