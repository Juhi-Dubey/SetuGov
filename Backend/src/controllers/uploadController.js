import { BadRequestError } from '../utils/errors.js';
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

export default {
  handleFileUpload
};
