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
export const verifyDocumentAuthorization = async (user, identifier) => {
  if (user.role === 'ADMIN') {
    return true; // Administrators have global verification and audit access
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  const safeFilename = path.basename(identifier);
  const isStoredFilename = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|jpeg)$/i.test(safeFilename);

  // 1. Check if document belongs to a StartupDocument
  let startupDoc = null;
  if (isUuid) {
    startupDoc = await prisma.startupDocument.findUnique({
      where: { id: identifier },
      include: { startup: true }
    });
  }
  if (!startupDoc && isStoredFilename) {
    startupDoc = await prisma.startupDocument.findFirst({
      where: {
        OR: [
          { document_url: { endsWith: `/${safeFilename}` } },
          { document_url: safeFilename }
        ]
      },
      include: { startup: true }
    });
  }

  if (startupDoc) {
    // STARTUP owner
    if (startupDoc.startup.user_id === user.id) return true;

    // GOVERNMENT: only if the startup has an application/pilot/procurement with the officer's department
    if (user.role === 'GOVERNMENT' && user.department_id) {
      const deptApp = await prisma.application.findFirst({
        where: {
          startup_id: startupDoc.startup_id,
          challenge: { department_id: user.department_id }
        }
      });
      if (deptApp) return true;

      const deptPilot = await prisma.pilot.findFirst({
        where: {
          startup_id: startupDoc.startup_id,
          challenge: { department_id: user.department_id }
        }
      });
      if (deptPilot) return true;

      const deptProc = await prisma.procurementRecord.findFirst({
        where: {
          startup_id: startupDoc.startup_id,
          department_id: user.department_id
        }
      });
      if (deptProc) return true;
    }

    // EVALUATOR: only if assigned to an active evaluation for this startup's application
    if (user.role === 'EVALUATOR') {
      const assignment = await prisma.evaluatorAssignment.findFirst({
        where: {
          evaluator_id: user.id,
          application: { startup_id: startupDoc.startup_id }
        }
      });
      if (assignment) return true;
    }

    return false;
  }

  // 2. Check if document belongs to an AccessRequest
  let accessRequest = null;
  if (isUuid) {
    accessRequest = await prisma.accessRequest.findUnique({
      where: { id: identifier }
    });
  }
  if (!accessRequest && isStoredFilename) {
    accessRequest = await prisma.accessRequest.findFirst({
      where: {
        OR: [
          { supporting_document_url: { endsWith: `/${safeFilename}` } },
          { supporting_document_url: safeFilename }
        ]
      }
    });
  }

  if (accessRequest) {
    if (user.email === accessRequest.email) return true;
    if (user.role === 'GOVERNMENT' && user.department_id && accessRequest.department_id === user.department_id) return true;
    if (user.role === 'GOVERNMENT' && accessRequest.nominated_by_user_id === user.id) return true;
    return false;
  }

  // 3. Check if document belongs to Evidence
  let evidence = null;
  if (isUuid) {
    evidence = await prisma.evidence.findUnique({
      where: { id: identifier },
      include: {
        pilot: {
          include: {
            challenge: true,
            startup: true
          }
        }
      }
    });
  }
  if (!evidence && isStoredFilename) {
    evidence = await prisma.evidence.findFirst({
      where: {
        OR: [
          { file_url: { endsWith: `/${safeFilename}` } },
          { file_url: safeFilename }
        ]
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
  }

  if (evidence) {
    if (evidence.uploaded_by === user.id) return true;
    if (evidence.pilot.startup.user_id === user.id) return true;
    if (user.role === 'GOVERNMENT' && evidence.pilot.challenge.department_id === user.department_id) return true;
    return false;
  }

  // 4. Check if document belongs to a Payment invoice
  let payment = null;
  if (isUuid) {
    payment = await prisma.payment.findUnique({
      where: { id: identifier },
      include: {
        pilot: {
          include: {
            challenge: true,
            startup: true
          }
        }
      }
    });
  }
  if (!payment && isStoredFilename) {
    payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { invoice_url: { endsWith: `/${safeFilename}` } },
          { invoice_url: safeFilename }
        ]
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
  }

  if (payment) {
    if (payment.pilot.startup.user_id === user.id) return true;
    if (user.role === 'GOVERNMENT' && payment.pilot.challenge.department_id === user.department_id) return true;
    return false;
  }

  // 5. Check if document belongs to a Procurement record
  let procurement = null;
  if (isUuid) {
    procurement = await prisma.procurementRecord.findUnique({
      where: { id: identifier },
      include: {
        startup: true,
        challenge: true
      }
    });
  }
  if (!procurement && isStoredFilename) {
    procurement = await prisma.procurementRecord.findFirst({
      where: {
        OR: [
          { contract_document_url: { endsWith: `/${safeFilename}` } },
          { contract_document_url: safeFilename },
          { delivery_evidence_url: { endsWith: `/${safeFilename}` } },
          { delivery_evidence_url: safeFilename },
          { gem_supporting_doc: { endsWith: `/${safeFilename}` } },
          { gem_supporting_doc: safeFilename }
        ]
      },
      include: {
        startup: true,
        challenge: true
      }
    });
  }

  if (procurement) {
    if (procurement.startup.user_id === user.id) return true;
    if (procurement.initiated_by === user.id || procurement.approved_by === user.id) return true;
    if (user.role === 'GOVERNMENT' && procurement.department_id === user.department_id) return true;
    return false;
  }

  // 6. Check if document belongs to an ApplicationDocument (Finalist Solution Package)
  let appDoc = null;
  if (isUuid) {
    appDoc = await prisma.applicationDocument.findUnique({
      where: { id: identifier },
      include: {
        application: {
          include: {
            startup: true,
            challenge: true,
            evaluator_assignments: true
          }
        }
      }
    });
  }
  if (!appDoc) {
    appDoc = await prisma.applicationDocument.findFirst({
      where: {
        OR: [
          { stored_filename: safeFilename },
          { stored_filename: identifier },
          { file_url: { contains: safeFilename } },
          { file_url: { contains: identifier } }
        ]
      },
      include: {
        application: {
          include: {
            startup: true,
            challenge: true,
            evaluator_assignments: true
          }
        }
      }
    });
  }

  if (appDoc && appDoc.application) {
    const app = appDoc.application;
    // 1. Startup owner of the application
    if (app.startup && app.startup.user_id === user.id) {
      return true;
    }
    // 2. Government creator of the challenge or matching department
    if (user.role === 'GOVERNMENT' && (app.challenge.created_by === user.id || (user.department_id && app.challenge.department_id === user.department_id))) {
      return true;
    }
    // 3. Assigned evaluator for this specific application (and not recused/declined)
    if (user.role === 'EVALUATOR' && app.evaluator_assignments) {
      const isAssigned = app.evaluator_assignments.some(
        a => a.evaluator_id === user.id && a.status !== 'RECUSED' && a.status !== 'DECLINED'
      );
      if (isAssigned) {
        return true;
      }
    }
    // Strictly deny access to unauthorized users for this application document
    return false;
  }

  return false;
};

/**
 * Retrieve a private document with path traversal protection, security headers, and resource-level authorization
 */
export const getPrivateFile = async (req, res, next) => {
  try {
    const rawIdentifier = req.params.filename || req.params.id;
    if (!rawIdentifier) {
      throw new BadRequestError('Filename or document identifier is required.');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawIdentifier);
    let resolvedFilename = rawIdentifier;

    if (isUuid) {
      const doc = await prisma.startupDocument.findUnique({ where: { id: rawIdentifier } });
      if (doc && doc.document_url) {
        resolvedFilename = path.basename(doc.document_url);
      } else {
        const evidence = await prisma.evidence.findUnique({ where: { id: rawIdentifier } });
        if (evidence && evidence.file_url) {
          resolvedFilename = path.basename(evidence.file_url);
        } else {
          const accessReq = await prisma.accessRequest.findUnique({ where: { id: rawIdentifier } });
          if (accessReq && accessReq.supporting_document_url) {
            resolvedFilename = path.basename(accessReq.supporting_document_url);
          } else {
            const payment = await prisma.payment.findUnique({ where: { id: rawIdentifier } });
            if (payment && payment.invoice_url) {
              resolvedFilename = path.basename(payment.invoice_url);
            } else {
              const appDoc = await prisma.applicationDocument.findUnique({ where: { id: rawIdentifier } });
              if (appDoc) {
                resolvedFilename = appDoc.stored_filename || path.basename(appDoc.file_url);
              }
            }
          }
        }
      }
    }

    // Path traversal defense
    const safeFilename = path.basename(resolvedFilename);
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(uploadsDir, safeFilename);

    // Verify canonical path does not escape uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      throw new BadRequestError('Invalid document path specified.');
    }

    // Perform resource-level authorization check FIRST before checking file existence
    const isAuthorized = await verifyDocumentAuthorization(req.user, rawIdentifier);
    if (!isAuthorized) {
      throw new ForbiddenError('You are not authorized to view or download this private verification document.');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Requested document not found.');
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
