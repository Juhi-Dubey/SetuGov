import userService from '../services/userService.js';
import { successResponse } from '../utils/response.js';

export const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query, req.user);
    return successResponse(res, result, 'Users retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.user_id || req.params.id;
    const user = await userService.getUserById(userId, req.user);
    return successResponse(res, { user }, 'User retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.user_id || req.params.id;
    const user = await userService.updateUser(userId, req.body, req.user);
    return successResponse(res, { user }, 'User updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const userId = req.params.user_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const user = await userService.updateUserStatus(userId, req.body.is_active, req.user, ip_address);
    return successResponse(res, { user }, 'User status updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus
};
