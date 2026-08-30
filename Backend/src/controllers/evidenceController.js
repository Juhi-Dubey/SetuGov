import evidenceService from '../services/evidenceService.js';
import { successResponse } from '../utils/response.js';

export const createEvidence = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const evidence = await evidenceService.createEvidence(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { evidence }, 'Evidence uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilotEvidence = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const evidence = await evidenceService.getPilotEvidence(pilotId);
    return successResponse(res, { evidence }, 'Pilot evidence retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getEvidenceById = async (req, res, next) => {
  try {
    const evidenceId = req.params.evidence_id || req.params.id;
    const evidence = await evidenceService.getEvidenceById(evidenceId);
    return successResponse(res, { evidence }, 'Evidence item retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateEvidence = async (req, res, next) => {
  try {
    const evidenceId = req.params.evidence_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const evidence = await evidenceService.updateEvidence(evidenceId, req.body, req.user, ip_address);
    return successResponse(res, { evidence }, 'Evidence updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createEvidence,
  getPilotEvidence,
  getEvidenceById,
  updateEvidence
};
