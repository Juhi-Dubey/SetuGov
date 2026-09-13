import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import embeddingService from './embeddingService.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

export const createStartup = async (data, user, ip_address = null) => {
  // Check if user already has a startup profile
  const existing = await prisma.startup.findFirst({
    where: { user_id: user.id }
  });

  if (existing && user.role !== 'ADMIN') {
    throw new BadRequestError('You already have an existing startup profile.');
  }

  const startup = await prisma.startup.create({
    data: {
      user_id: user.id,
      company_name: data.company_name.trim(),
      description: data.description.trim(),
      domain: data.domain.trim(),
      technologies: data.technologies,
      readiness_level: data.readiness_level || 1,
      years_experience: data.years_experience || 0,
      previous_deployments: data.previous_deployments || 0,
      verification_status: 'PENDING',
      dpiit_number: data.dpiit_number ? data.dpiit_number.trim() : null,
      certificate_number: data.certificate_number ? data.certificate_number.trim() : null,
      incorporation_date: data.incorporation_date ? new Date(data.incorporation_date) : null,
      cin_number: data.cin_number ? data.cin_number.trim() : null,
      gstin: data.gstin ? data.gstin.trim() : null,
      location: data.location.trim()
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Attempt real 768-dim semantic embedding generation
  try {
    const text = embeddingService.buildStartupEmbeddingText(startup);
    const emb = await embeddingService.generateEmbedding(text);
    await embeddingService.persistStartupEmbedding(startup.id, emb);
  } catch (embErr) {
    logger.warn(`Startup ${startup.id} created; embedding generation deferred: ${embErr.message}`);
  }

  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_PROFILE_CREATED',
    entity_type: 'STARTUP',
    entity_id: startup.id,
    details: { company_name: startup.company_name, domain: startup.domain },
    ip_address
  });

  return startup;
};

export const getStartups = async (query = {}, user = null) => {
  const {
    domain,
    verification_status,
    search,
    page = 1,
    limit = 20
  } = query;

  const where = {};
  if (domain) where.domain = domain;
  if (verification_status) where.verification_status = verification_status;
  if (search) {
    where.OR = [
      { company_name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { domain: { contains: search, mode: 'insensitive' } }
    ];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const [total, startups] = await Promise.all([
    prisma.startup.count({ where }),
    prisma.startup.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        documents: true,
        _count: {
          select: {
            applications: true,
            pilots: true
          }
        }
      }
    })
  ]);

  return {
    startups,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

export const getStartupById = async (id, user = null) => {
  const startup = await prisma.startup.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      documents: true,
      _count: {
        select: {
          applications: true,
          pilots: true
        }
      }
    }
  });

  if (!startup) {
    throw new NotFoundError(`Startup with ID ${id} not found.`);
  }

  // If another startup is querying this startup, filter out private user email and unverified documents
  if (user && user.role === 'STARTUP' && startup.user_id !== user.id) {
    return {
      ...startup,
      user: {
        id: startup.user.id,
        name: startup.user.name
      },
      documents: startup.documents.filter(d => d.verification_status === 'VERIFIED')
    };
  }

  return startup;
};

export const updateStartup = async (id, data, user, ip_address = null) => {
  const startup = await prisma.startup.findUnique({ where: { id } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${id} not found.`);
  }

  if (user.role !== 'ADMIN' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only update your own startup profile.');
  }

  // Whitelist allowable update fields (P1-6: Eliminate mass assignment)
  const allowedFields = [
    'company_name',
    'description',
    'domain',
    'technologies',
    'readiness_level',
    'years_experience',
    'previous_deployments',
    'location',
    'dpiit_number',
    'certificate_number',
    'incorporation_date',
    'cin_number',
    'gstin'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'incorporation_date' && data[field]) {
        updateData[field] = new Date(data[field]);
      } else {
        updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
      }
    }
  }

  const updated = await prisma.startup.update({
    where: { id },
    data: updateData,
    include: {
      documents: true
    }
  });

  if (updateData.company_name || updateData.domain || updateData.description || updateData.technologies) {
    try {
      const text = embeddingService.buildStartupEmbeddingText(updated);
      const emb = await embeddingService.generateEmbedding(text);
      await embeddingService.persistStartupEmbedding(updated.id, emb);
    } catch (embErr) {
      logger.warn(`Startup ${updated.id} updated; embedding refresh deferred: ${embErr.message}`);
    }
  }

  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_PROFILE_UPDATED',
    entity_type: 'STARTUP',
    entity_id: id,
    details: { changes: data },
    ip_address
  });

  return updated;
};

export const addStartupDocument = async (startupId, data, user, ip_address = null) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  if (user.role !== 'ADMIN' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only upload documents for your own startup.');
  }

  const document = await prisma.startupDocument.create({
    data: {
      startup_id: startupId,
      document_type: data.document_type.trim(),
      document_url: data.document_url.trim(),
      verification_status: 'PENDING'
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_DOCUMENT_UPLOADED',
    entity_type: 'STARTUP_DOCUMENT',
    entity_id: document.id,
    details: { startup_id: startupId, document_type: document.document_type },
    ip_address
  });

  return document;
};

export const getStartupDocuments = async (startupId, user = null) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  if (user && user.role === 'STARTUP' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only view documents for your own startup profile.');
  }

  const documents = await prisma.startupDocument.findMany({
    where: { startup_id: startupId },
    orderBy: { created_at: 'desc' }
  });

  return documents;
};

export const verifyStartup = async (startupId, data, user, ip_address = null) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  // Update startup verification status
  const updatedStartup = await prisma.startup.update({
    where: { id: startupId },
    data: {
      verification_status: data.verification_status,
      verification_notes: data.comments || null,
      verified_by: user.id,
      verified_at: new Date()
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      documents: true
    }
  });

  // Also update associated documents
  await prisma.startupDocument.updateMany({
    where: { startup_id: startupId },
    data: {
      verification_status: data.verification_status,
      verified_by: user.id,
      verified_at: new Date()
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: `STARTUP_${data.verification_status}`,
    entity_type: 'STARTUP',
    entity_id: startupId,
    details: {
      previousStatus: startup.verification_status,
      newStatus: data.verification_status,
      comments: data.comments || null
    },
    ip_address
  });

  if (startup.user_id) {
    await sendNotification({
      user_id: startup.user_id,
      title: `Startup Verification: ${data.verification_status}`,
      message: `Your startup profile verification status has been updated to ${data.verification_status}.`,
      type: 'STARTUP_VERIFIED',
      link: '/startup/dashboard'
    });
  }

  return updatedStartup;
};

export const getStartupApplications = async (startupId, user) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  // Role check: Startups can only view their own applications; Government & Admin can view
  if (user.role === 'STARTUP' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only view your own startup applications.');
  }

  const applications = await prisma.application.findMany({
    where: { startup_id: startupId },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          status: true,
          department: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return applications;
};

export const getStartupPilots = async (startupId, user) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  if (user.role === 'STARTUP' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only view your own startup pilots.');
  }

  const pilots = await prisma.pilot.findMany({
    where: { startup_id: startupId },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          department: {
            select: {
              name: true
            }
          }
        }
      },
      kpis: true,
      milestones: true
    },
    orderBy: { created_at: 'desc' }
  });

  return pilots;
};

/**
 * Calculates startup performance track record dynamically from database records
 */
export const getStartupPerformance = async (startupId, user = null) => {
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    include: {
      applications: true,
      pilots: {
        include: {
          kpis: true,
          milestones: true,
          scale_decisions: true
        }
      }
    }
  });

  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  const pilots = startup.pilots || [];
  const totalPilots = pilots.length;
  const scaledPilots = pilots.filter(p => p.status === 'SCALED').length;
  const completedPilots = pilots.filter(p => p.status === 'COMPLETED').length;
  const extendedPilots = pilots.filter(p => p.status === 'EXTENDED').length;
  const stoppedPilots = pilots.filter(p => p.status === 'STOPPED').length;
  const activePilots = pilots.filter(p => p.status === 'RUNNING' || p.status === 'PLANNED' || p.status === 'VALIDATION').length;

  // Calculate KPI success rate
  let totalKpis = 0;
  let achievedKpis = 0;
  pilots.forEach(p => {
    (p.kpis || []).forEach(k => {
      totalKpis++;
      if (k.actual_value !== null && k.target_value !== null) {
        const isDecrease = k.target_value < k.baseline_value;
        if (isDecrease ? (k.actual_value <= k.target_value) : (k.actual_value >= k.target_value)) {
          achievedKpis++;
        }
      }
    });
  });

  const kpiSuccessRate = totalKpis > 0 ? Math.round((achievedKpis / totalKpis) * 100) : 100;
  const successfulPilots = scaledPilots + completedPilots;
  const pilotSuccessRate = totalPilots > 0 ? Math.round((successfulPilots / totalPilots) * 100) : 100;

  const totalApplications = startup.applications.length;
  const shortlistedApplications = startup.applications.filter(a => a.status === 'SHORTLISTED' || a.status === 'SELECTED').length;

  return {
    startup_id: startup.id,
    company_name: startup.company_name,
    verification_status: startup.verification_status,
    dpiit_number: startup.dpiit_number,
    metrics: {
      total_pilots: totalPilots,
      scaled_pilots: scaledPilots,
      completed_pilots: completedPilots,
      extended_pilots: extendedPilots,
      stopped_pilots: stoppedPilots,
      active_pilots: activePilots,
      pilot_success_rate: pilotSuccessRate,
      kpi_success_rate: kpiSuccessRate,
      total_kpis_tracked: totalKpis,
      total_applications: totalApplications,
      shortlisted_applications: shortlistedApplications
    }
  };
};

export default {
  createStartup,
  getStartups,
  getStartupById,
  updateStartup,
  addStartupDocument,
  getStartupDocuments,
  verifyStartup,
  getStartupApplications,
  getStartupPilots,
  getStartupPerformance
};

