/**
 * Abstract Base Storage Provider Interface
 *
 * Defines the contract that any storage engine (Local Filesystem,
 * Amazon S3, MinIO, Azure Blob, Google Cloud Storage) must fulfill.
 */
export class BaseStorageProvider {
  /**
   * Persist a file from a temporary or local source path to target key
   * @param {string} sourcePath - Local path of the source file
   * @param {string} key - Unique target storage key/identifier
   * @param {object} [options]
   * @returns {Promise<{ key: string, size: number, mimeType?: string, storedAt: Date }>}
   */
  async saveFile(sourcePath, key, options = {}) {
    throw new Error('saveFile() must be implemented by storage provider subclass');
  }

  /**
   * Persist a buffer directly to target key
   * @param {string} key - Unique target storage key/identifier
   * @param {Buffer} buffer - Buffer data
   * @param {object} [options]
   * @returns {Promise<{ key: string, size: number, mimeType?: string, storedAt: Date }>}
   */
  async saveBuffer(key, buffer, options = {}) {
    throw new Error('saveBuffer() must be implemented by storage provider subclass');
  }

  /**
   * Check if a file exists in storage
   * @param {string} key - Storage key/identifier
   * @returns {Promise<boolean>}
   */
  async fileExists(key) {
    throw new Error('fileExists() must be implemented by storage provider subclass');
  }

  /**
   * Open and return a readable stream for the stored file
   * @param {string} key - Storage key/identifier
   * @returns {Promise<{ stream: import('stream').Readable, size?: number, mimeType?: string }>}
   */
  async getFileStream(key) {
    throw new Error('getFileStream() must be implemented by storage provider subclass');
  }

  /**
   * Delete a file from storage safely and idempotently
   * @param {string} key - Storage key/identifier
   * @returns {Promise<boolean>} - True if deleted or did not exist
   */
  async deleteFile(key) {
    throw new Error('deleteFile() must be implemented by storage provider subclass');
  }

  /**
   * Retrieve metadata for a stored file
   * @param {string} key - Storage key/identifier
   * @returns {Promise<{ key: string, size: number, mimeType?: string, modifiedAt?: Date } | null>}
   */
  async getFileMetadata(key) {
    throw new Error('getFileMetadata() must be implemented by storage provider subclass');
  }
}

export default BaseStorageProvider;
