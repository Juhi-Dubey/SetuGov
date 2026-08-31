import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const createDepartment = async (data, user, ip_address = null) => {
  if (user && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only administrators are authorized to create departments.');
  }

  const normalizedName = data.name.trim();
  const normalizedState = data.state.trim();
  const normalizedEmail = data.contact_email.trim().toLowerCase();

  // Pre-check for duplicate department with same normalized name and state
  const existingDept = await prisma.department.findFirst({
    where: {
      name: { equals: normalizedName, mode: 'insensitive' },
      state: { equals: normalizedState, mode: 'insensitive' }
    }
  });

  if (existingDept) {
    throw new ConflictError(
      `A department with name "${normalizedName}" in state "${normalizedState}" already exists.`
    );
  }

  let department;
  try {
    department = await prisma.department.create({
      data: {
        name: normalizedName,
        state: normalizedState,
        contact_email: normalizedEmail
      }
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ConflictError(
        `A department with name "${normalizedName}" in state "${normalizedState}" already exists.`
      );
    }
    throw error;
  }

  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: 'DEPARTMENT_CREATED',
      entity_type: 'DEPARTMENT',
      entity_id: department.id,
      details: { name: department.name, state: department.state },
      ip_address
    });
  }

  return department;
};

export const getDepartments = async () => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          challenges: true
        }
      }
    }
  });

  return departments;
};

export const getDepartmentById = async (id) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true
        }
      },
      challenges: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true
        }
      }
    }
  });

  if (!department) {
    throw new NotFoundError(`Department with ID ${id} not found.`);
  }

  return department;
};

export const updateDepartment = async (id, data, user, ip_address = null) => {
  // Authorization check:
  // - ADMIN can update any department.
  // - GOVERNMENT can update only their own assigned department.
  // - Otherwise, forbidden.
  if (user) {
    if (user.role === 'GOVERNMENT' && user.department_id !== id) {
      throw new ForbiddenError('Government officials are only authorized to update their own assigned department.');
    }
    if (user.role !== 'ADMIN' && user.role !== 'GOVERNMENT') {
      throw new ForbiddenError('You do not have permission to update departments.');
    }
  }

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Department with ID ${id} not found.`);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.state !== undefined) updateData.state = data.state.trim();
  if (data.contact_email !== undefined) updateData.contact_email = data.contact_email.trim().toLowerCase();

  // If updating name or state, verify no duplicate department collision
  if (updateData.name !== undefined || updateData.state !== undefined) {
    const checkName = updateData.name || existing.name;
    const checkState = updateData.state || existing.state;

    const duplicate = await prisma.department.findFirst({
      where: {
        name: { equals: checkName, mode: 'insensitive' },
        state: { equals: checkState, mode: 'insensitive' },
        NOT: { id }
      }
    });

    if (duplicate) {
      throw new ConflictError(
        `A department with name "${checkName}" in state "${checkState}" already exists.`
      );
    }
  }

  let updated;
  try {
    updated = await prisma.department.update({
      where: { id },
      data: updateData
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ConflictError(
        'A department with the specified name and state already exists.'
      );
    }
    throw error;
  }

  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: 'DEPARTMENT_UPDATED',
      entity_type: 'DEPARTMENT',
      entity_id: id,
      details: { changes: updateData },
      ip_address
    });
  }

  return updated;
};

export default {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment
};
