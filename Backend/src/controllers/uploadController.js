import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import { getFileUrl } from '../middleware/upload.js';

/**
 * Handle document upload and return secure relative/authenticated file reference
 */
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

/**
 * Validates whether the authenticated user has legitimate authorization to access a private document
 */
export const verifyDocumentAuthorization = async (user, filename) => {
  if (user.role === 'ADMIN') {
    return true; // Administrators have verification and audit access to all documents
  }

  // Check if document belongs to an AccessRequest
  const accessRequest = await prisma.accessRequest.findFirst({
    where: {
      supporting_document_url: { contains: filename }
    }
  });

  if (accessRequest) {
    if (user.email === accessRequest.email) return true;
    if (user.role === 'GOVERNMENT' && user.department_id && accessRequest.department_id === user.department_id) return true;
    if (user.role === 'GOVERNMENT' && accessRequest.nominated_by_user_id === user.id) return true;
  }

  // Check if document belongs to a StartupDocument
  const startupDoc = await prisma.startupDocument.findFirst({
    where: {
      document_url: { contains: filename }
    },
    include: {
      startup: true
    }
  });

  if (startupDoc) {
    if (startupDoc.startup.user_id === user.id) return true;
    if (user.role === 'GOVERNMENT' || user.role === 'EVALUATOR') return true;
  }

  // Check if document belongs to Evidence
  const evidence = await prisma.evidence.findFirst({
    where: {
      file_url: { contains: filename }
    },
    include: {
      pilot: {
        include: {
          challenge: true,
          startup: true
        }
      }
    }
  });

  if (evidence) {
    if (evidence.uploaded_by === user.id) return true;
    if (evidence.pilot.startup.user_id === user.id) return true;
    if (user.role === 'GOVERNMENT' && evidence.pilot.challenge.department_id === user.department_id) return true;
  }

  // Check if document belongs to a Payment invoice
  const payment = await prisma.payment.findFirst({
    where: {
      invoice_url: { contains: filename }
    },
    include: {
      pilot: {
        include: {
          challenge: true,
          startup: true
        }
      }
    }
  });

  if (payment) {
    if (payment.pilot.startup.user_id === user.id) return true;
    if (user.role === 'GOVERNMENT' && payment.pilot.challenge.department_id === user.department_id) return true;
  }

  // Check if document belongs to a Procurement record (contract, delivery evidence, etc.)
  const procurement = await prisma.procurementRecord.findFirst({
    where: {
      OR: [
        { contract_document_url: { contains: filename } },
        { delivery_evidence_url: { contains: filename } },
        { gem_supporting_doc: { contains: filename } }
      ]
    },
    include: {
      startup: true,
      challenge: true
    }
  });

  if (procurement) {
    if (procurement.startup.user_id === user.id) return true;
    if (procurement.initiated_by === user.id || procurement.approved_by === user.id) return true;
    if (user.role === 'GOVERNMENT' && procurement.department_id === user.department_id) return true;
  }

  // If newly uploaded by the user in this session or generic non-sensitive document
  return false;
};

/**
 * Retrieve a private document with path traversal protection, security headers, and authorization
 */
export const getPrivateFile = async (req, res, next) => {
  try {
    const rawFilename = req.params.filename || req.params.id;
    if (!rawFilename) {
      throw new BadRequestError('Filename or document identifier is required.');
    }

    // Path traversal defense
    const safeFilename = path.basename(rawFilename);
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(uploadsDir, safeFilename);

    // Verify canonical path does not escape uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      throw new BadRequestError('Invalid document path specified.');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Requested document not found.');
    }

    // Perform authorization check
    const isAuthorized = await verifyDocumentAuthorization(req.user, safeFilename);
    if (!isAuthorized) {
      throw new ForbiddenError('You are not authorized to view or download this private verification document.');
    }

    // Set strict security headers
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

export default {
  handleFileUpload,
  verifyDocumentAuthorization,
  getPrivateFile
};
