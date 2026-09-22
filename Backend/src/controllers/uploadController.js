import path from 'path';
import { prisma } from '../config/prisma.js';
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';
import { getFileUrl } from '../middleware/upload.js';
import { createAuditLog } from '../services/auditService.js';
import storageService from '../services/storageService.js';

/**
 * Handle document upload and return secure relative/authenticated file reference
 */
export const handleFileUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file provided. Please attach a file in the "file" form field.');
    }

    const fileUrl = getFileUrl(req, req.file.filename);

    // Audit the file upload to maintain provenance
    if (req.user) {
      const clientIp = req.ip || (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : null);
      await createAuditLog({
        user_id: req.user.id,
        action: 'DOCUMENT_UPLOADED',
        entity_type: 'DOCUMENT',
        entity_id: req.file.filename,
        details: {
          file_name: req.file.originalname,
          stored_name: req.file.filename,
          file_size: req.file.size,
          mime_type: req.file.mimetype
        },
        ip_address: clientIp
      });
    }

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
  // CRITICAL SECURITY FIX: Unauthenticated access is NEVER permitted
  if (!user || !user.id || !user.role) {
    return false;
  }

  if (user.is_active === false) {
    return false;
  }

  if (user.role === 'ADMIN') {
    return true; // Administrators have global verification and audit access
  }

  const cleanIdentifier = String(identifier || '').split('?')[0].split('#')[0].trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanIdentifier);
  const safeFilename = path.basename(cleanIdentifier);

  // 1. Check if document belongs to a StartupDocument
  let startupDoc = null;
  if (isUuid) {
    startupDoc = await prisma.startupDocument.findUnique({
      where: { id: cleanIdentifier },
      include: { startup: true }
    });
  }
  if (!startupDoc && safeFilename) {
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
    if (startupDoc.startup?.user_id === user.id) return true;
    if (user.startups && user.startups.some(s => s.id === startupDoc.startup_id)) return true;

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
          application: { startup_id: startupDoc.startup_id },
          status: { notIn: ['RECUSED', 'DECLINED'] }
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
      where: { id: cleanIdentifier }
    });
  }
  if (!accessRequest && safeFilename) {
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
    if (user.email && user.email.toLowerCase() === accessRequest.email.toLowerCase()) return true;
    if (user.role === 'GOVERNMENT' && user.department_id && accessRequest.department_id === user.department_id) return true;
    if (user.role === 'GOVERNMENT' && accessRequest.nominated_by_user_id === user.id) return true;
    return false;
  }

  // 3. Check if document belongs to Evidence
  let evidence = null;
  if (isUuid) {
    evidence = await prisma.evidence.findUnique({
      where: { id: cleanIdentifier },
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
  if (!evidence && safeFilename) {
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
    if (evidence.pilot?.startup?.user_id === user.id) return true;
    if (user.startups && evidence.pilot?.startup_id && user.startups.some(s => s.id === evidence.pilot.startup_id)) return true;
    if (user.role === 'GOVERNMENT' && user.department_id && evidence.pilot?.challenge?.department_id === user.department_id) return true;
    if (user.role === 'EVALUATOR' && evidence.pilot?.application_id) {
      const assignment = await prisma.evaluatorAssignment.findFirst({
        where: {
          evaluator_id: user.id,
          application_id: evidence.pilot.application_id,
          status: { notIn: ['RECUSED', 'DECLINED'] }
        }
      });
      if (assignment) return true;
    }
    return false;
  }

  // 4. Check if document belongs to a Payment invoice
  let payment = null;
  if (isUuid) {
    payment = await prisma.payment.findUnique({
      where: { id: cleanIdentifier },
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
  if (!payment && safeFilename) {
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
    if (payment.pilot?.startup?.user_id === user.id) return true;
    if (user.startups && payment.pilot?.startup_id && user.startups.some(s => s.id === payment.pilot.startup_id)) return true;
    if (user.role === 'GOVERNMENT' && user.department_id && payment.pilot?.challenge?.department_id === user.department_id) return true;
    return false;
  }

  // 5. Check if document belongs to a Procurement record
  let procurement = null;
  if (isUuid) {
    procurement = await prisma.procurementRecord.findUnique({
      where: { id: cleanIdentifier },
      include: {
        startup: true,
        challenge: true
      }
    });
  }
  if (!procurement && safeFilename) {
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
    if (procurement.startup?.user_id === user.id) return true;
    if (user.startups && procurement.startup_id && user.startups.some(s => s.id === procurement.startup_id)) return true;
    if (procurement.initiated_by === user.id || procurement.approved_by === user.id) return true;
    if (user.role === 'GOVERNMENT' && user.department_id && procurement.department_id === user.department_id) return true;
    return false;
  }

  // 6. Check if document belongs to an ApplicationDocument (Finalist Solution Package)
  let appDoc = null;
  if (isUuid) {
    appDoc = await prisma.applicationDocument.findUnique({
      where: { id: cleanIdentifier },
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
  if (!appDoc && safeFilename) {
    appDoc = await prisma.applicationDocument.findFirst({
      where: {
        OR: [
          { stored_filename: safeFilename },
          { stored_filename: cleanIdentifier },
          { file_url: { endsWith: `/${safeFilename}` } },
          { file_url: safeFilename }
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
    if (app.startup && (app.startup.user_id === user.id || (user.startups && user.startups.some(s => s.id === app.startup_id)))) {
      return true;
    }
    // 2. Government creator of the challenge or matching department
    if (user.role === 'GOVERNMENT' && (app.challenge?.created_by === user.id || (user.department_id && app.challenge?.department_id === user.department_id))) {
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

  // 7. Check if user was the direct authenticated uploader of this unattached/staged document
  if (safeFilename) {
    const uploadLog = await prisma.auditLog.findFirst({
      where: {
        action: 'DOCUMENT_UPLOADED',
        entity_type: 'DOCUMENT',
        entity_id: safeFilename,
        user_id: user.id
      }
    });
    if (uploadLog) {
      return true;
    }
  }

  return false;
};

/**
 * Retrieve a private document with path traversal protection, security headers, and resource-level authorization
 */
export const getPrivateFile = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required to access private documents.');
    }

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

    // Path traversal defense via storage abstraction
    const safeFilename = storageService.sanitizeStorageKey(resolvedFilename);

    // Perform resource-level authorization check FIRST before checking file existence
    const isAuthorized = await verifyDocumentAuthorization(req.user, rawIdentifier);
    if (!isAuthorized) {
      if (req.user) {
        const clientIp = req.ip || (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : null);
        await createAuditLog({
          user_id: req.user.id,
          action: 'DOCUMENT_ACCESS_DENIED',
          entity_type: 'DOCUMENT',
          entity_id: rawIdentifier,
          details: {
            file_name: safeFilename,
            attempted_by: req.user.id,
            role: req.user.role
          },
          ip_address: clientIp
        });
      }
      throw new ForbiddenError('You are not authorized to view or download this private verification document.');
    }

    // Verify file exists in storage provider
    const exists = await storageService.fileExists(safeFilename);
    if (!exists) {
      throw new NotFoundError('Requested document not found.');
    }

    // Audit successful private document access
    if (req.user) {
      const clientIp = req.ip || (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : null);
      await createAuditLog({
        user_id: req.user.id,
        action: 'DOCUMENT_ACCESSED',
        entity_type: 'DOCUMENT',
        entity_id: rawIdentifier,
        details: {
          file_name: safeFilename,
          access_role: req.user.role
        },
        ip_address: clientIp
      });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm'
    };

    const fileStreamData = await storageService.getFileStream(safeFilename);

    res.setHeader('Content-Type', fileStreamData.mimeType || mimeMap[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    if (fileStreamData.size) {
      res.setHeader('Content-Length', fileStreamData.size);
    }

    fileStreamData.stream.on('error', (err) => {
      if (!res.headersSent) {
        next(err);
      }
    });

    fileStreamData.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export default {
  handleFileUpload,
  verifyDocumentAuthorization,
  getPrivateFile
};
