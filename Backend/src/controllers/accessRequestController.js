import accessRequestService from '../services/accessRequestService.js';
import { successResponse } from '../utils/response.js';

export const createEvaluatorSelfApplication = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.createEvaluatorSelfApplication(req.body, ip_address);
    return successResponse(
      res,
      result,
      'Your evaluator application has been submitted successfully and is pending administrative review.',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const createGovernmentAccessRequest = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.createGovernmentAccessRequest(req.body, ip_address);
    return successResponse(
      res,
      result,
      'Your official government access request has been submitted successfully and is pending administrative review.',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const createGovernmentNomination = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.createGovernmentNomination(req.body, req.user, ip_address);
    return successResponse(
      res,
      result,
      'Evaluator nomination submitted successfully for administrative review.',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const getAccessRequests = async (req, res, next) => {
  try {
    const result = await accessRequestService.getAccessRequests(req.query, req.user);
    return successResponse(res, result, 'Access requests retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getAccessRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await accessRequestService.getAccessRequestById(id, req.user);
    return successResponse(res, result, 'Access request details retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const reviewAccessRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.reviewAccessRequest(id, req.user, ip_address);
    return successResponse(res, result, 'Access request status marked as UNDER_REVIEW', 200);
  } catch (error) {
    next(error);
  }
};

export const approveAccessRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.approveAccessRequest(id, req.body, req.user, ip_address);
    // Sanitize response: strip raw setup_token so it is never exposed over HTTP
    const sanitizedResult = {
      ...result,
      invitation: result.invitation ? { ...result.invitation } : undefined
    };
    if (sanitizedResult.invitation?.setup_token) {
      delete sanitizedResult.invitation.setup_token;
    }
    return successResponse(
      res,
      sanitizedResult,
      'Access request approved. User account provisioned and invitation token generated.',
      200
    );
  } catch (error) {
    next(error);
  }
};

export const rejectAccessRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.rejectAccessRequest(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Access request has been rejected.', 200);
  } catch (error) {
    next(error);
  }
};

export const resendInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.resendInvitation(id, req.user, ip_address);
    // Sanitize response: strip raw setup_token so it is never exposed over HTTP
    const sanitizedResult = {
      ...result,
      invitation: result.invitation ? { ...result.invitation } : undefined
    };
    if (sanitizedResult.invitation?.setup_token) {
      delete sanitizedResult.invitation.setup_token;
    }
    return successResponse(res, sanitizedResult, 'Invitation re-generated successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const revokeInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await accessRequestService.revokeInvitation(id, req.user, ip_address);
    return successResponse(res, result, 'Invitation revoked successfully and request placed back in review.', 200);
  } catch (error) {
    next(error);
  }
};

export const checkAccessRequestStatus = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await accessRequestService.checkAccessRequestStatus(email);
    return successResponse(res, result, 'Access request status retrieved successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createEvaluatorSelfApplication,
  createGovernmentAccessRequest,
  createGovernmentNomination,
  getAccessRequests,
  getAccessRequestById,
  reviewAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  resendInvitation,
  revokeInvitation,
  checkAccessRequestStatus
};
