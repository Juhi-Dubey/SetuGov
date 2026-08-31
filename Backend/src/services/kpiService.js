import { prisma } from '../config/prisma.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';

export const createKpi = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has KPI_MANAGE access to this pilot
  await verifyPilotAccess(pilotId, user, 'KPI_MANAGE');

  const kpi = await prisma.pilotKpi.create({
    data: {
      pilot_id: pilotId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      unit: data.unit.trim(),
      baseline_value: data.baseline_value,
      target_value: data.target_value,
      actual_value: data.actual_value !== undefined ? data.actual_value : null,
      weight: data.weight || 1.0,
      status: 'ACTIVE'
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_KPI_CREATED',
    entity_type: 'PILOT_KPI',
    entity_id: kpi.id,
    details: { pilot_id: pilotId, name: kpi.name },
    ip_address
  });

  return kpi;
};

export const getPilotKpis = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const kpis = await prisma.pilotKpi.findMany({
    where: { pilot_id: pilotId },
    include: {
      measurements: {
        orderBy: { measurement_date: 'desc' },
        take: 10
      }
    },
    orderBy: { created_at: 'asc' }
  });

  return kpis;
};

export const getKpiById = async (id, user = null) => {
  const kpi = await prisma.pilotKpi.findUnique({
    where: { id },
    include: {
      pilot: true,
      measurements: {
        orderBy: { measurement_date: 'desc' }
      }
    }
  });

  if (!kpi) {
    throw new NotFoundError(`KPI with ID ${id} not found.`);
  }

  if (user) {
    await verifyPilotAccess(kpi.pilot_id, user, 'READ');
  }

  return kpi;
};

export const updateKpi = async (id, data, user, ip_address = null) => {
  const kpi = await prisma.pilotKpi.findUnique({ where: { id } });
  if (!kpi) {
    throw new NotFoundError(`KPI with ID ${id} not found.`);
  }

  // P0-3: Verify user has KPI_MANAGE access to the parent pilot
  await verifyPilotAccess(kpi.pilot_id, user, 'KPI_MANAGE');

  // P1-6: Whitelist allowable update fields
  const allowedFields = [
    'name',
    'description',
    'unit',
    'baseline_value',
    'target_value',
    'actual_value',
    'weight'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  }

  const updated = await prisma.pilotKpi.update({
    where: { id },
    data: updateData
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_KPI_UPDATED',
    entity_type: 'PILOT_KPI',
    entity_id: id,
    details: { changes: updateData },
    ip_address
  });

  return updated;
};

export const createMeasurement = async (pilotId, data, user, ip_address = null) => {
  // P0-3: Verify user has MEASUREMENT_CREATE access
  await verifyPilotAccess(pilotId, user, 'MEASUREMENT_CREATE');

  // Verify KPI belongs to this pilot
  const kpi = await prisma.pilotKpi.findUnique({
    where: { id: data.kpi_id }
  });

  if (!kpi || kpi.pilot_id !== pilotId) {
    throw new BadRequestError(`KPI ${data.kpi_id} does not belong to pilot ${pilotId}.`);
  }

  // Create measurement and update KPI actual_value atomically
  const [measurement] = await prisma.$transaction([
    prisma.pilotMeasurement.create({
      data: {
        pilot_id: pilotId,
        kpi_id: data.kpi_id,
        value: data.value,
        source: data.source.trim(),
        verified: data.verified || false,
        measurement_date: data.measurement_date ? new Date(data.measurement_date) : new Date()
      }
    }),
    prisma.pilotKpi.update({
      where: { id: data.kpi_id },
      data: { actual_value: data.value }
    })
  ]);

  await createAuditLog({
    user_id: user.id,
    action: 'KPI_MEASUREMENT_RECORDED',
    entity_type: 'PILOT_MEASUREMENT',
    entity_id: measurement.id,
    details: { pilot_id: pilotId, kpi_id: data.kpi_id, value: data.value },
    ip_address
  });

  return measurement;
};

export const getPilotMeasurements = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const measurements = await prisma.pilotMeasurement.findMany({
    where: { pilot_id: pilotId },
    include: {
      kpi: {
        select: {
          id: true,
          name: true,
          unit: true
        }
      }
    },
    orderBy: { measurement_date: 'desc' }
  });

  return measurements;
};

export default {
  createKpi,
  getPilotKpis,
  getKpiById,
  updateKpi,
  createMeasurement,
  getPilotMeasurements
};
