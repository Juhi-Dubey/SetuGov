import procurementService from '../services/procurementService.js';
import { successResponse } from '../utils/response.js';

export const createReadiness = async (req, res, next) => {
  try {
    const pilotId = req.params.pilotId || req.body.pilot_id || req.body.pilotId;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.createProcurementReadiness(pilotId, req.body, req.user, ip_address);
    return successResponse(res, result, 'Procurement readiness package initialized successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const approveProcurement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.approveProcurement(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Procurement package approved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const handoffToGeM = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.handoffToGeM(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Procurement route handoff recorded successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const issueContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.issueContract(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Contract / Purchase Order recorded successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const submitDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.submitDelivery(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Delivery evidence submitted successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const acceptDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.acceptDelivery(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Delivery acceptance recorded successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const completeProcurement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.completeProcurement(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Procurement process completed successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await procurementService.createProcurementPayment(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Procurement payment scheduled successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const listProcurements = async (req, res, next) => {
  try {
    const list = await procurementService.getProcurements(req.query, req.user);
    return successResponse(res, list, 'Procurement records retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getProcurement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await procurementService.getProcurementById(id, req.user);
    return successResponse(res, data, 'Procurement details retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createReadiness,
  approveProcurement,
  handoffToGeM,
  issueContract,
  submitDelivery,
  acceptDelivery,
  completeProcurement,
  createPayment,
  listProcurements,
  getProcurement
};
