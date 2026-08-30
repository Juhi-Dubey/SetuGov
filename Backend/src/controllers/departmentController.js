import departmentService from '../services/departmentService.js';
import { successResponse } from '../utils/response.js';

export const createDepartment = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const department = await departmentService.createDepartment(req.body, req.user, ip_address);
    return successResponse(res, { department }, 'Department created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await departmentService.getDepartments();
    return successResponse(res, { departments }, 'Departments retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const departmentId = req.params.department_id || req.params.id;
    const department = await departmentService.getDepartmentById(departmentId);
    return successResponse(res, { department }, 'Department retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const departmentId = req.params.department_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const department = await departmentService.updateDepartment(departmentId, req.body, req.user, ip_address);
    return successResponse(res, { department }, 'Department updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment
};
