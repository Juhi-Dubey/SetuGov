import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { generateMockEmbedding } from '../utils/vector.js';
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

  const embeddingText = `${data.company_name} ${data.domain} ${data.description} ${data.technologies.join(' ')}`;
  const embedding = generateMockEmbedding(embeddingText);

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
      location: data.location.trim(),
      embedding
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
    'location'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  }

  if (updateData.company_name || updateData.domain || updateData.description || updateData.technologies) {
    const name = updateData.company_name || startup.company_name;
    const dom = updateData.domain || startup.domain;
    const desc = updateData.description || startup.description;
    const techs = updateData.technologies || startup.technologies;
    updateData.embedding = generateMockEmbedding(`${name} ${dom} ${desc} ${techs.join(' ')}`);
  }

  const updated = await prisma.startup.update({
    where: { id },
    data: updateData,
    include: {
      documents: true
    }
  });

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
      verification_status: data.verification_status
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

export default {
  createStartup,
  getStartups,
  getStartupById,
  updateStartup,
  addStartupDocument,
  getStartupDocuments,
  verifyStartup,
  getStartupApplications,
  getStartupPilots
};
