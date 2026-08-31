import pilotService from '../services/pilotService.js';
import { successResponse } from '../utils/response.js';

export const createPilot = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const pilot = await pilotService.createPilot(req.body, req.user, ip_address);
    return successResponse(res, { pilot }, 'Pilot created successfully in PLANNED status', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilots = async (req, res, next) => {
  try {
    const result = await pilotService.getPilots(req.query, req.user);
    return successResponse(res, result, 'Pilots retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getPilotById = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const pilot = await pilotService.getPilotById(pilotId, req.user);
    return successResponse(res, { pilot }, 'Pilot details retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updatePilot = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const pilot = await pilotService.updatePilot(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { pilot }, 'Pilot updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const startPilot = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const pilot = await pilotService.startPilot(pilotId, req.user, ip_address);
    return successResponse(res, { pilot }, 'Pilot started (status: RUNNING)', 200);
  } catch (error) {
    next(error);
  }
};

export const completePilot = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const pilot = await pilotService.completePilot(pilotId, req.user, ip_address);
    return successResponse(res, { pilot }, 'Pilot completed (status: COMPLETED)', 200);
  } catch (error) {
    next(error);
  }
};

export const getPilotDashboard = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const dashboard = await pilotService.getPilotDashboard(pilotId, req.user);
    return successResponse(res, dashboard, 'Pilot dashboard retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createPilot,
  getPilots,
  getPilotById,
  updatePilot,
  startPilot,
  completePilot,
  getPilotDashboard
};
