import scaleDecisionService from '../services/scaleDecisionService.js';
import { successResponse } from '../utils/response.js';

export const createScaleDecision = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const decision = await scaleDecisionService.createScaleDecision(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { scaleDecision: decision }, `Scale decision '${req.body.decision}' finalized successfully`, 201);
  } catch (error) {
    next(error);
  }
};

export const getScaleDecision = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const decision = await scaleDecisionService.getScaleDecision(pilotId);
    return successResponse(res, { scaleDecision: decision }, 'Scale decision retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createScaleDecision,
  getScaleDecision
};
