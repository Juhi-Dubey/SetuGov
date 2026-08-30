import paymentService from '../services/paymentService.js';
import { successResponse } from '../utils/response.js';

export const createPayment = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const payment = await paymentService.createPayment(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { payment }, 'Payment milestone scheduled successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilotPayments = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const payments = await paymentService.getPilotPayments(pilotId);
    return successResponse(res, { payments }, 'Pilot payments retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const paymentId = req.params.payment_id || req.params.id;
    const payment = await paymentService.getPaymentById(paymentId);
    return successResponse(res, { payment }, 'Payment details retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const paymentId = req.params.payment_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const payment = await paymentService.updatePaymentStatus(
      paymentId,
      req.body.status,
      req.body.payment_date,
      req.user,
      ip_address
    );
    return successResponse(res, { payment }, `Payment status updated to ${req.body.status}`, 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createPayment,
  getPilotPayments,
  getPaymentById,
  updatePaymentStatus
};
