import authService from '../services/authService.js';
import { successResponse } from '../utils/response.js';

export const register = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await authService.register({
      ...req.body,
      ip_address
    });
    return successResponse(res, result, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await authService.login({
      ...req.body,
      ip_address
    });
    return successResponse(res, result, 'Login successful', 200);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return successResponse(res, { user }, 'User profile retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    return successResponse(res, {}, 'Logged out successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  getMe,
  logout
};
