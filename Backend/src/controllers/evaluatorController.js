import evaluatorService from '../services/evaluatorService.js';
import { successResponse } from '../utils/response.js';

export const getEvaluators = async (req, res, next) => {
  try {
    const result = await evaluatorService.getEvaluators(req.query, req.user);
    return successResponse(res, result, 'Evaluators retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getEvaluatorProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await evaluatorService.getEvaluatorProfile(id, req.user);
    return successResponse(res, profile, 'Evaluator profile retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateEvaluatorProfile = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const profile = await evaluatorService.createOrUpdateEvaluatorProfile(req.body, req.user, ip_address);
    return successResponse(res, profile, 'Evaluator profile updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const verifyEvaluator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const profile = await evaluatorService.verifyEvaluator(id, req.body, req.user, ip_address);
    return successResponse(res, profile, `Evaluator ${req.body.verification_status} successfully`, 200);
  } catch (error) {
    next(error);
  }
};

export const nominateEvaluator = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorService.nominateEvaluator(req.body, req.user, ip_address);
    return successResponse(res, result, 'Evaluator nomination submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const assignEvaluatorToApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorService.assignEvaluatorToApplication(applicationId, req.body, req.user, ip_address);
    return successResponse(res, result, 'Evaluator assigned to application successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyAssignments = async (req, res, next) => {
  try {
    const result = await evaluatorService.getMyAssignments(req.user, req.query);
    return successResponse(res, result, 'Evaluator assignments retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const assignmentId = req.params.assignment_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorService.updateAssignmentStatus(assignmentId, req.body, req.user, ip_address);
    return successResponse(res, result, 'Assignment status updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getApplicationAssignments = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const result = await evaluatorService.getApplicationAssignments(applicationId, req.user);
    return successResponse(res, result, 'Application evaluator assignments retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  getEvaluators,
  getEvaluatorProfile,
  updateEvaluatorProfile,
  verifyEvaluator,
  nominateEvaluator,
  assignEvaluatorToApplication,
  getMyAssignments,
  updateAssignmentStatus,
  getApplicationAssignments
};
