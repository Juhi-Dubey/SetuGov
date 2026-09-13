import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BadRequestError } from '../utils/errors.js';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/pjpeg'
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

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
    return cb(
      new BadRequestError(
        `Invalid file type "${ext || mime}". Supported file formats are PDF, PNG, and JPG/JPEG.`
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
 * Middleware wrapper for single file upload with standard error handling
 * @param {string} fieldName 
 */
export const uploadSingle = (fieldName = 'file') => {
  const multerSingle = upload.single(fieldName);
  return (req, res, next) => {
    multerSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError(`File exceeds maximum allowable size of 10 MB.`));
        }
        return next(new BadRequestError(`File upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

/**
 * Helper to construct the absolute public HTTP URL for an uploaded file
 */
export const getFileUrl = (req, filename) => {
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}/uploads/${filename}`;
};

export default {
  upload,
  uploadSingle,
  getFileUrl
};
