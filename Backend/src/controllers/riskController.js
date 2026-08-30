import riskService from '../services/riskService.js';
import { successResponse } from '../utils/response.js';

export const createRisk = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const risk = await riskService.createRisk(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { risk }, 'Risk logged successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilotRisks = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const risks = await riskService.getPilotRisks(pilotId);
    return successResponse(res, { risks }, 'Pilot risks retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getRiskById = async (req, res, next) => {
  try {
    const riskId = req.params.risk_id || req.params.id;
    const risk = await riskService.getRiskById(riskId);
    return successResponse(res, { risk }, 'Risk details retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateRisk = async (req, res, next) => {
  try {
    const riskId = req.params.risk_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const risk = await riskService.updateRisk(riskId, req.body, req.user, ip_address);
    return successResponse(res, { risk }, 'Risk updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createRisk,
  getPilotRisks,
  getRiskById,
  updateRisk
};
