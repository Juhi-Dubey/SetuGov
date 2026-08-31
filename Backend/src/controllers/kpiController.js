import kpiService from '../services/kpiService.js';
import { successResponse } from '../utils/response.js';

export const createKpi = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const kpi = await kpiService.createKpi(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { kpi }, 'KPI created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilotKpis = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const kpis = await kpiService.getPilotKpis(pilotId, req.user);
    return successResponse(res, { kpis }, 'Pilot KPIs retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getKpiById = async (req, res, next) => {
  try {
    const kpiId = req.params.kpi_id || req.params.id;
    const kpi = await kpiService.getKpiById(kpiId, req.user);
    return successResponse(res, { kpi }, 'KPI retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateKpi = async (req, res, next) => {
  try {
    const kpiId = req.params.kpi_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const kpi = await kpiService.updateKpi(kpiId, req.body, req.user, ip_address);
    return successResponse(res, { kpi }, 'KPI updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const createMeasurement = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const measurement = await kpiService.createMeasurement(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { measurement }, 'KPI measurement recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilotMeasurements = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const measurements = await kpiService.getPilotMeasurements(pilotId, req.user);
    return successResponse(res, { measurements }, 'Pilot measurements retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createKpi,
  getPilotKpis,
  getKpiById,
  updateKpi,
  createMeasurement,
  getPilotMeasurements
};
