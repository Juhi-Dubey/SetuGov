import path from 'path';
import fs from 'fs';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import { getFileUrl } from '../middleware/upload.js';

export const handleFileUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file provided. Please attach a file in the "file" form field.');
    }

    const fileUrl = getFileUrl(req, req.file.filename);

    return successResponse(
      res,
      {
        file_url: fileUrl,
        file_name: req.file.originalname,
        stored_name: req.file.filename,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      },
      'File uploaded successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const getPrivateFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      throw new BadRequestError('Filename is required.');
    }

    // Path traversal defense
    const safeFilename = path.basename(filename);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Requested document not found.');
    }

    // Role-based access control: Only ADMIN or authorized users
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenError('Access to private verification documents requires administrator authorization.');
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

export default {
  handleFileUpload,
  getPrivateFile
};
