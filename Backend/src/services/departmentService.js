import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const createDepartment = async (data, user, ip_address = null) => {
  const department = await prisma.department.create({
    data: {
      name: data.name.trim(),
      state: data.state.trim(),
      contact_email: data.contact_email.trim().toLowerCase()
    }
  });

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
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Department with ID ${id} not found.`);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.state !== undefined) updateData.state = data.state.trim();
  if (data.contact_email !== undefined) updateData.contact_email = data.contact_email.trim().toLowerCase();

  const updated = await prisma.department.update({
    where: { id },
    data: updateData
  });

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
