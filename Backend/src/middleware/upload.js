import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BadRequestError } from '../utils/errors.js';
import storageService from '../services/storageService.js';

const uploadsDir = storageService.getLocalStorageDir();

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg',
  '.doc', '.docx', '.ppt', '.pptx',
  '.mp4', '.webm', '.zip'
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/pjpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'video/webm',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream'
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.has(mime);
  if (!ALLOWED_EXTENSIONS.has(ext) || !mimeAllowed) {
    return cb(
      new BadRequestError(
        `Invalid file type "${ext || mime}". Supported file formats are PDF, DOC/DOCX, PPT/PPTX, PNG, JPG, and MP4/WEBM.`
      )
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * Validates actual file signature (magic bytes) against declared MIME type and extension
 * @param {string} filePath 
 * @returns {boolean}
 */
// export const validateFileSignature = (filePath, extension) => {
//   try {
//     const buffer = Buffer.alloc(12);
//     const fd = fs.openSync(filePath, 'r');
//     fs.readSync(fd, buffer, 0, 12, 0);
//     fs.closeSync(fd);

//     // PDF: %PDF (0x25 0x50 0x44 0x46)
//     const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
//     // PNG: 89 50 4E 47
//     const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
//     // JPEG: FF D8 FF
//     const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
//     // ZIP / OOXML (DOCX, PPTX): PK (0x50 0x4B 0x03 0x04) or empty zip (0x50 0x4B 0x05 0x06)
//     const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && (buffer[2] === 0x03 || buffer[2] === 0x05);
//     // Legacy MS Office (DOC, PPT): D0 CF 11 E0
//     const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
//     // MP4: bytes 4-7 are 'ftyp'
//     const isMp4 = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
//     // WEBM: 1A 45 DF A3
//     const isWebm = buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
//     // Data URI prefix: 'data:'
//     const isDataUri = buffer.toString('utf8', 0, 5) === 'data:';

//     return isPdf || isPng || isJpg || isZip || isOle || isMp4 || isWebm || isDataUri;
//   } catch (err) {
//     return false;
//   }
// };

export const validateFileSignature = (filePath, extension) => {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');

    try {
      fs.readSync(fd, buffer, 0, 12, 0);
    } finally {
      fs.closeSync(fd);
    }

    const ext = extension.toLowerCase();

    const isPdf =
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;

    const isJpg =
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isZip =
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;

    const isOle =
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0;

    const isMp4 =
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70;

    const isWebm =
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3;

    const extensionMatches = {
      '.pdf': isPdf,
      '.png': isPng,
      '.jpg': isJpg,
      '.jpeg': isJpg,
      '.doc': isOle,
      '.ppt': isOle,
      '.docx': isZip,
      '.pptx': isZip,
      '.zip': isZip,
      '.mp4': isMp4,
      '.webm': isWebm
    };

    return extensionMatches[ext] === true;
  } catch {
    return false;
  }
};

/**
 * Middleware wrapper for single file upload with standard error handling
 * @param {string} fieldName 
 */
export const uploadSingle = (fieldName = 'file') => {
  const multerSingle = upload.single(fieldName);
  return (req, res, next) => {
    multerSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError(`File exceeds maximum allowable size of 50 MB.`));
        }
        return next(new BadRequestError(`File upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }

      if (req.file) {
        const isValid = validateFileSignature(
          req.file.path,
          path.extname(req.file.originalname)
        );
        if (!isValid) {
          storageService.deleteTempFile(req.file.path);
          return next(new BadRequestError('Uploaded file content does not match allowable format signatures (PDF, DOC/DOCX, PPT/PPTX, PNG, JPG, MP4/WEBM). Executables and disguised files are rejected.'));
        }
      }

      next();
    });
  };
};

/**
 * NOTE ON MALWARE SCANNING (Phase 1 Production Requirement):
 * In local and sandbox environments, file extension, MIME type, and binary magic bytes
 * (PDF %PDF, PNG \x89PNG, JPG \xFF\xD8\xFF) are verified prior to storage.
 * In production deployment, an asynchronous or streaming ClamAV / AWS GuardDuty S3 malware
 * scanning pipe must inspect all uploaded streams prior to persistence.
 */

/**
 * Helper to construct the authenticated document URL for an uploaded file
 */
export const getFileUrl = (req, filename) => {
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}/api/v1/documents/${filename}`;
};

export default {
  upload,
  uploadSingle,
  validateFileSignature,
  getFileUrl
};
