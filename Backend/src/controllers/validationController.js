import validationService from '../services/validationService.js';
import { successResponse } from '../utils/response.js';

export const createValidation = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const validation = await validationService.createValidation(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { validation }, 'Validation report submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilotValidations = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const validations = await validationService.getPilotValidations(pilotId, req.user);
    return successResponse(res, { validations }, 'Pilot validations retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateValidation = async (req, res, next) => {
  try {
    const validationId = req.params.validation_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const validation = await validationService.updateValidation(validationId, req.body, req.user, ip_address);
    return successResponse(res, { validation }, 'Validation report updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createValidation,
  getPilotValidations,
  updateValidation
};
