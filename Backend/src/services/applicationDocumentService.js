import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';
import { getFileUrl } from '../middleware/upload.js';

/**
 * Upload a solution document for a shortlisted finalist application
 */
export const uploadSolutionDocument = async (applicationId, file, data = {}, user = null, req = null, ip_address = null) => {
  if (!file) {
    throw new BadRequestError('No file provided for upload.');
  }

  // Handle flexible signature: uploadSolutionDocument(applicationId, file, user)
  if (data && data.role && !user) {
    user = data;
    data = {};
  }

  if (!user) {
    throw new ForbiddenError('User context is required to upload solution documents.');
  }

  // 1. Fetch application with challenge and startup details
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      challenge: true,
      startup: true,
      evaluations: { select: { id: true } }
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  // 2. Lifecycle check: Challenge cannot be CLOSED
  if (application.challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot upload documents: This problem statement is CLOSED.');
  }

  // 3. Ownership / Authorization check
  const isOwner = application.startup.user_id === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Unauthorized: Only the startup owning this application can upload solution documents.');
  }

  // 4. Finalist Status check: Must be SHORTLISTED
  if (application.status !== 'SHORTLISTED') {
    throw new BadRequestError(`Cannot upload solution package: Application status is '${application.status}'. Only SHORTLISTED finalists can submit solution packages.`);
  }

  const originalname = file.originalname || file.filename || 'document.pdf';
  const storedFilename = file.filename || file.stored_filename || `file_${Date.now()}.pdf`;
  const fileSize = file.size || file.file_size || 1024;
  const mimeType = file.mimetype || file.mime_type || 'application/pdf';

  // 5. Server-side Deadline check
  const now = new Date();
  if (application.challenge.finalist_submission_deadline) {
    const deadline = new Date(application.challenge.finalist_submission_deadline);
    if (now > deadline) {
      await createAuditLog({
        user_id: user.id,
        action: 'FINALIST_DEADLINE_EXCEEDED',
        entity_type: 'APPLICATION',
        entity_id: applicationId,
        details: {
          deadline: deadline.toISOString(),
          attempted_at: now.toISOString(),
          file_name: originalname
        },
        ip_address
      });

      throw new BadRequestError(`Finalist submission deadline has passed: The deadline for submitting solution materials was ${deadline.toISOString()}.`);
    }
  }

  // 6. Proposal Locking: Block modification if submission is finalized or evaluations have commenced
  if (application.submitted_at) {
    throw new BadRequestError('Cannot modify solution package: Submission has already been finalized.');
  }

  if (application.evaluations.length > 0) {
    throw new BadRequestError('Cannot modify solution package: Independent evaluation has already commenced on this application.');
  }

  const documentType = data.document_type || file.document_type || 'PROPOSAL_DOC';
  const description = data.description ? data.description.trim() : (file.description || null);
  const fileUrl = file.file_url || (req ? getFileUrl(req, storedFilename) : `/uploads/${storedFilename}`);

  // 7. Persist ApplicationDocument record
  const document = await prisma.applicationDocument.create({
    data: {
      application_id: applicationId,
      uploaded_by: user.id,
      original_filename: originalname,
      stored_filename: storedFilename,
      file_url: fileUrl,
      file_size: fileSize,
      mime_type: mimeType,
      document_type: documentType,
      description
    }
  });

  // 8. Audit logging
  await createAuditLog({
    user_id: user.id,
    action: 'SOLUTION_DOCUMENT_UPLOADED',
    entity_type: 'APPLICATION_DOCUMENT',
    entity_id: document.id,
    details: {
      application_id: applicationId,
      challenge_id: application.challenge_id,
      document_type: documentType,
      original_filename: file.originalname,
      file_size: file.size
    },
    ip_address
  });

  return document;
};

/**
 * Get all solution documents for an application with strict RBAC
 */
export const getApplicationDocuments = async (applicationId, user) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      challenge: true,
      startup: true,
      evaluator_assignments: {
        where: { evaluator_id: user.id }
      }
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  // RBAC checks:
  // 1. Startup owner
  const isOwner = application.startup.user_id === user.id;
  // 2. Admin
  const isAdmin = user.role === 'ADMIN';
  // 3. Government officer in the challenge department
  const isGov = user.role === 'GOVERNMENT' && (!user.department_id || user.department_id === application.challenge.department_id);
  // 4. Assigned evaluator with an active assignment
  const isAssignedEvaluator = user.role === 'EVALUATOR' && application.evaluator_assignments.length > 0 && ['ACCEPTED', 'COMPLETED', 'PENDING'].includes(application.evaluator_assignments[0].status);

  if (!isOwner && !isAdmin && !isGov && !isAssignedEvaluator) {
    throw new ForbiddenError('You are not authorized to view this application\'s solution documents.');
  }

  const documents = await prisma.applicationDocument.findMany({
    where: { application_id: applicationId },
    orderBy: { created_at: 'desc' },
    include: {
      uploader: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  return documents;
};

/**
 * Delete a solution document with deadline and lock guards
 */
export const deleteSolutionDocument = async (applicationId, documentId, user, ip_address = null) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      challenge: true,
      startup: true,
      evaluations: { select: { id: true } }
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  if (application.challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot delete documents: This problem statement is CLOSED.');
  }

  const isOwner = application.startup.user_id === user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Unauthorized: Only the startup owning this application can delete its documents.');
  }

  if (application.submitted_at) {
    throw new BadRequestError('Cannot delete document: Submission has already been finalized.');
  }

  if (application.evaluations.length > 0) {
    throw new BadRequestError('Cannot delete document: Independent evaluation has already commenced.');
  }

  if (application.challenge.finalist_submission_deadline && new Date() > new Date(application.challenge.finalist_submission_deadline)) {
    throw new BadRequestError('Cannot delete document: The submission deadline has passed.');
  }

  const document = await prisma.applicationDocument.findFirst({
    where: {
      id: documentId,
      application_id: applicationId
    }
  });

  if (!document) {
    throw new NotFoundError(`Document with ID ${documentId} not found on this application.`);
  }

  // Attempt to delete physical file safely
  try {
    const filePath = path.join(process.cwd(), 'uploads', document.stored_filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Non-blocking log
  }

  await prisma.applicationDocument.delete({
    where: { id: documentId }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'SOLUTION_DOCUMENT_DELETED',
    entity_type: 'APPLICATION_DOCUMENT',
    entity_id: documentId,
    details: {
      application_id: applicationId,
      challenge_id: application.challenge_id,
      original_filename: document.original_filename
    },
    ip_address
  });

  return { success: true, message: 'Document deleted successfully.' };
};

/**
 * Finalize finalist solution submission (locks submission and notifies government)
 */
export const finalizeSolutionSubmission = async (applicationId, user, ip_address = null) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      challenge: true,
      startup: true,
      documents: true
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  if (application.challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot finalize submission: This problem statement is CLOSED.');
  }

  const isOwner = application.startup.user_id === user.id;
  if (!isOwner && user.role !== 'ADMIN') {
    throw new ForbiddenError('Unauthorized: Only the applicant can finalize this solution package.');
  }

  if (application.status !== 'SHORTLISTED') {
    throw new BadRequestError(`Only SHORTLISTED finalist applications can finalize a solution package.`);
  }

  if (application.challenge.finalist_submission_deadline && new Date() > new Date(application.challenge.finalist_submission_deadline)) {
    throw new BadRequestError('Cannot finalize submission: The deadline has passed.');
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      submitted_at: new Date()
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'FINALIST_SUBMISSION_COMPLETED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    details: {
      challenge_id: application.challenge_id,
      document_count: application.documents.length
    },
    ip_address
  });

  // Notify challenge creator
  if (application.challenge.created_by) {
    await sendNotification({
      user_id: application.challenge.created_by,
      title: 'Finalist Solution Package Submitted',
      message: `Startup "${application.startup.company_name}" has submitted their solution package for "${application.challenge.title}".`,
      type: 'SUBMISSION_FINALIZED',
      link: `/government/challenges/${application.challenge_id}/applications`
    });
  }

  return updated;
};

export default {
  uploadSolutionDocument,
  getApplicationDocuments,
  deleteSolutionDocument,
  finalizeSolutionSubmission
};
