import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const getUsers = async (query = {}) => {
  const {
    role,
    department_id,
    is_active,
    page = 1,
    limit = 20
  } = query;

  const where = {};
  if (role) where.role = role;
  if (department_id) where.department_id = department_id;
  if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department_id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        department: {
          select: {
            id: true,
            name: true,
            state: true
          }
        },
        startups: {
          select: {
            id: true,
            company_name: true,
            verification_status: true
          }
        }
      }
    })
  ]);

  return {
    users,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department_id: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      department: {
        select: {
          id: true,
          name: true,
          state: true,
          contact_email: true
        }
      },
      startups: {
        select: {
          id: true,
          company_name: true,
          verification_status: true,
          domain: true
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundError(`User with ID ${id} not found.`);
  }

  return user;
};

export const updateUser = async (id, data, currentUser) => {
  // Check authorization: Admin can update anyone; others can only update their own profile
  if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
    throw new ForbiddenError('You can only update your own user profile.');
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`User with ID ${id} not found.`);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (currentUser.role === 'ADMIN' && data.department_id !== undefined) {
    updateData.department_id = data.department_id;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department_id: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      department: {
        select: {
          id: true,
          name: true,
          state: true
        }
      }
    }
  });

  return updatedUser;
};

export const updateUserStatus = async (id, isActive, adminUser, ip_address = null) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`User with ID ${id} not found.`);
  }

  if (existing.id === adminUser.id && !isActive) {
    throw new ForbiddenError('Administrators cannot deactivate their own account.');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { is_active: isActive },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      updated_at: true
    }
  });

  // Audit log for status change
  await createAuditLog({
    user_id: adminUser.id,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    entity_type: 'USER',
    entity_id: id,
    details: { previousStatus: existing.is_active, newStatus: isActive },
    ip_address
  });

  return updatedUser;
};

export default {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus
};
