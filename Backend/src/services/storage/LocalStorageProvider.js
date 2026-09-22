import fs from 'fs';
import path from 'path';
import { BaseStorageProvider } from './BaseStorageProvider.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Local Filesystem Storage Provider
 *
 * Persists documents into a configured local directory (default: <cwd>/uploads).
 * Strictly prevents path traversal by asserting canonical path boundaries.
 */
export class LocalStorageProvider extends BaseStorageProvider {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir] - Absolute root directory for storage
   */
  constructor(options = {}) {
    super();
    this.baseDir = path.resolve(options.baseDir || path.join(process.cwd(), 'uploads'));
    this._ensureBaseDir();
  }

  _ensureBaseDir() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      logger.error('Failed to initialize local storage directory:', err.message);
      throw err;
    }
  }

  /**
   * Resolves and verifies that a storage key resolves strictly within baseDir
   * @param {string} key
   * @returns {string} Absolute verified local file path
   */
  resolvePath(key) {
    if (!key || typeof key !== 'string') {
      throw new BadRequestError('Invalid file identifier specified.');
    }

    // Strip null bytes and normalize
    const cleaned = key.replace(/\0/g, '').trim();
    if (cleaned.includes('..')) {
      throw new BadRequestError('Invalid document path specified.');
    }

    const base = path.basename(cleaned);

    if (!base || base === '.' || base === '..' || base.includes('..')) {
      throw new BadRequestError('Invalid document path specified.');
    }

    const resolved = path.resolve(this.baseDir, base);

    // Assert canonical containment
    if (!resolved.startsWith(this.baseDir) || path.dirname(resolved) !== this.baseDir) {
      throw new BadRequestError('Invalid document path specified.');
    }

    return resolved;
  }

  async saveFile(sourcePath, key, options = {}) {
    const targetPath = this.resolvePath(key);

    try {
      if (options.move) {
        // Atomic move if on same filesystem, fallback to copy + unlink
        try {
          fs.renameSync(sourcePath, targetPath);
        } catch (renameErr) {
          fs.copyFileSync(sourcePath, targetPath);
          fs.unlinkSync(sourcePath);
        }
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }

      const stat = fs.statSync(targetPath);
      return {
        key,
        size: stat.size,
        mimeType: options.mimeType,
        storedAt: stat.birthtime || stat.mtime
      };
    } catch (err) {
      logger.error('LocalStorageProvider saveFile error:', err.message);
      throw err;
    }
  }

  async saveBuffer(key, buffer, options = {}) {
    const targetPath = this.resolvePath(key);

    try {
      fs.writeFileSync(targetPath, buffer);
      const stat = fs.statSync(targetPath);
      return {
        key,
        size: stat.size,
        mimeType: options.mimeType,
        storedAt: stat.birthtime || stat.mtime
      };
    } catch (err) {
      logger.error('LocalStorageProvider saveBuffer error:', err.message);
      throw err;
    }
  }

  async fileExists(key) {
    try {
      const targetPath = this.resolvePath(key);
      return fs.existsSync(targetPath);
    } catch (err) {
      if (err instanceof BadRequestError) return false;
      throw err;
    }
  }

  async getFileStream(key) {
    const targetPath = this.resolvePath(key);

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError('Requested document not found.');
    }

    try {
      const stat = fs.statSync(targetPath);
      const stream = fs.createReadStream(targetPath);
      return {
        stream,
        size: stat.size,
        modifiedAt: stat.mtime
      };
    } catch (err) {
      logger.error('LocalStorageProvider getFileStream error:', err.message);
      throw err;
    }
  }

  async deleteFile(key) {
    try {
      const targetPath = this.resolvePath(key);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      return true;
    } catch (err) {
      if (err instanceof BadRequestError) return false;
      logger.warn(`Failed to delete local storage file [${key}]:`, err.message);
      return false;
    }
  }

  async getFileMetadata(key) {
    try {
      const targetPath = this.resolvePath(key);
      if (!fs.existsSync(targetPath)) {
        return null;
      }
      const stat = fs.statSync(targetPath);
      return {
        key,
        size: stat.size,
        modifiedAt: stat.mtime
      };
    } catch (err) {
      if (err instanceof BadRequestError) return null;
      throw err;
    }
  }

  getBaseDir() {
    return this.baseDir;
  }
}

export default LocalStorageProvider;
