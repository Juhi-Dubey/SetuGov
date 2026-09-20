import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors.js';
import embeddingService from './embeddingService.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';
import { refreshMatchingForPublishedChallenges } from './matchingService.js';
import { PATTERNS } from './verificationService.js';
import {
  isValidState,
  isValidCityForState,
  getCanonicalCityName
} from '../data/indiaLocations.js';
import {
  encryptString,
  decryptString,
  isEncrypted,
  maskAccountNumber
} from '../utils/encryption.js';
import { normalizeDomain } from '../utils/domainUtils.js';

export { maskAccountNumber };

export const getRequiredDocumentTypes = (orgType) => {
  const normalized = (orgType || 'PRIVATE_LIMITED').toUpperCase();
  switch (normalized) {
    case 'PRIVATE_LIMITED':
    case 'PUBLIC_LIMITED':
    case 'LLP':
    case 'PARTNERSHIP':
    case 'TRUST':
    case 'SOCIETY':
    case 'OTHER':
      return ['PAN', 'INCORPORATION_CERTIFICATE', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
    case 'PROPRIETORSHIP':
      return ['PAN', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
    default:
      return ['PAN', 'INCORPORATION_CERTIFICATE', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
  }
};

/**
 * GeM-Style Startup Service
 */

export const createStartup = async (data, user, ip_address = null) => {
  // Check if user already has a startup profile
  const existing = await prisma.startup.findFirst({
    where: { user_id: user.id }
  });

  if (existing && user.role !== 'ADMIN') {
    throw new ConflictError('You already have an existing startup profile.');
  }

  // Duplicate checks for registered identifiers
  if (data.pan_number) {
    const dupPan = await prisma.startup.findFirst({
      where: {
        pan_number: data.pan_number.trim().toUpperCase(),
        verification_status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'] }
      }
    });
    if (dupPan) throw new ConflictError('A startup with this PAN is already registered or undergoing verification.');
  }

  if (data.cin_number) {
    const dupCin = await prisma.startup.findFirst({
      where: {
        cin_number: data.cin_number.trim().toUpperCase(),
        verification_status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'] }
      }
    });
    if (dupCin) throw new ConflictError('A startup with this CIN is already registered or undergoing verification.');
  }

  if (data.gstin) {
    const dupGst = await prisma.startup.findFirst({
      where: {
        gstin: data.gstin.trim().toUpperCase(),
        verification_status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'] }
      }
    });
    if (dupGst) throw new ConflictError('A startup with this GSTIN is already registered or undergoing verification.');
  }

  // Validate State / UT and City if provided
  let cleanState = data.state && typeof data.state === 'string' ? data.state.trim() : null;
  let cleanCity = data.city && typeof data.city === 'string' ? data.city.trim() : null;

  if (cleanState) {
    if (!isValidState(cleanState)) {
      throw new BadRequestError(`Invalid State / UT '${cleanState}'. Please select a canonical Indian State or Union Territory.`);
    }
  }

  if (cleanCity) {
    if (!cleanState) {
      throw new BadRequestError('Cannot specify city without selecting a valid State / UT.');
    }
    if (!isValidCityForState(cleanState, cleanCity)) {
      throw new BadRequestError(`Invalid city '${cleanCity}' for State / UT '${cleanState}'. Please select a valid canonical city.`);
    }
    cleanCity = getCanonicalCityName(cleanState, cleanCity) || cleanCity;
  }

  // Validate Postal PIN code if provided
  let cleanPin = data.pincode ? String(data.pincode).trim() : null;
  if (cleanPin) {
    if (!PATTERNS.PINCODE.test(cleanPin)) {
      throw new BadRequestError('Postal PIN code must be exactly 6 numeric digits (e.g. 560001).');
    }
  }

  // Normalize and deduplicate technologies
  let cleanTechs = [];
  if (Array.isArray(data.technologies)) {
    const seenLower = new Set();
    for (const item of data.technologies) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed && trimmed.length <= 80 && !seenLower.has(trimmed.toLowerCase())) {
          seenLower.add(trimmed.toLowerCase());
          cleanTechs.push(trimmed);
        }
      }
    }
    if (cleanTechs.length > 50) {
      throw new BadRequestError('Cannot specify more than 50 technologies.');
    }
  }

  const startup = await prisma.startup.create({
    data: {
      user_id: user.id,
      company_name: data.company_name.trim(),
      org_type: data.org_type || 'PRIVATE_LIMITED',
      registered_address: data.registered_address ? data.registered_address.trim() : null,
      city: cleanCity,
      state: cleanState,
      pincode: cleanPin,
      official_email: data.official_email ? data.official_email.trim().toLowerCase() : null,
      official_website: data.official_website ? data.official_website.trim() : null,
      authorized_person_name: data.authorized_person_name ? data.authorized_person_name.trim() : null,
      authorized_person_designation: data.authorized_person_designation ? data.authorized_person_designation.trim() : null,
      authorized_person_email: data.authorized_person_email ? data.authorized_person_email.trim().toLowerCase() : null,
      authorized_person_phone: data.authorized_person_phone ? data.authorized_person_phone.trim() : null,
      authorization_type: data.authorization_type ? data.authorization_type.trim() : null,
      pan_number: data.pan_number ? data.pan_number.trim().toUpperCase() : null,
      cin_number: data.cin_number ? data.cin_number.trim().toUpperCase() : null,
      gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
      dpiit_number: data.dpiit_number ? data.dpiit_number.trim() : null,
      certificate_number: data.certificate_number ? data.certificate_number.trim() : null,
      incorporation_date: data.incorporation_date ? new Date(data.incorporation_date) : null,
      description: data.description ? data.description.trim() : '',
      domain: data.domain ? normalizeDomain(data.domain) : '',
      technologies: cleanTechs,
      products_services: data.products_services ? data.products_services.trim() : null,
      readiness_level: data.readiness_level || 1,
      years_experience: data.years_experience || 0,
      previous_deployments: data.previous_deployments || 0,
      location: data.location ? data.location.trim() : '',
      verification_status: 'DRAFT',
      verification_source: 'SELF_DECLARED'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          is_verified: true
        }
      },
      documents: true,
      bank_details: true
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

/**
 * Get current logged in user's startup registration dossier
 */
export const getMyRegistration = async (userId) => {
  let startup = await prisma.startup.findFirst({
    where: { user_id: userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_active: true,
          is_verified: true,
          email_verified_at: true,
          created_at: true
        }
      },
      documents: {
        orderBy: { created_at: 'desc' }
      },
      bank_details: true,
      _count: {
        select: {
          applications: true,
          pilots: true
        }
      }
    }
  });

  // If no startup record exists yet, create an initial DRAFT record
  if (!startup) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found.');

    startup = await prisma.startup.create({
      data: {
        user_id: userId,
        company_name: '',
        description: '',
        domain: '',
        technologies: [],
        location: '',
        verification_status: 'DRAFT',
        verification_source: 'SELF_DECLARED'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            is_active: true,
            is_verified: true,
            email_verified_at: true,
            created_at: true
          }
        },
        documents: true,
        bank_details: true,
        _count: {
          select: {
            applications: true,
            pilots: true
          }
        }
      }
    });
  }

  if (startup && startup.bank_details) {
    startup.bank_details.masked_account_number = maskAccountNumber(startup.bank_details.account_number);
    startup.bank_details.account_number = maskAccountNumber(startup.bank_details.account_number);
  }

  return startup;
};

export const getStartups = async (query = {}, user = null) => {
  const {
    domain,
    verification_status,
    org_type,
    search,
    page = 1,
    limit = 20
  } = query;

  const where = {};
  if (domain) where.domain = normalizeDomain(domain);
  if (verification_status) {
    where.verification_status = verification_status;
  } else if (!user || user.role !== 'ADMIN') {
    // Non-admin queries default strictly to VERIFIED startups so DRAFT records are never exposed publicly
    where.verification_status = 'VERIFIED';
  }
  if (org_type) where.org_type = org_type;
  if (search) {
    where.OR = [
      { company_name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { domain: { contains: search, mode: 'insensitive' } },
      { pan_number: { contains: search, mode: 'insensitive' } },
      { dpiit_number: { contains: search, mode: 'insensitive' } }
    ];
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  // Sensitive bank_details are EXCLUDED from public listing
  const [total, startups] = await Promise.all([
    prisma.startup.count({ where }),
    prisma.startup.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        company_name: true,
        org_type: true,
        domain: true,
        technologies: true,
        readiness_level: true,
        years_experience: true,
        previous_deployments: true,
        verification_status: true,
        verification_source: true,
        dpiit_number: true,
        city: true,
        state: true,
        location: true,
        created_at: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        documents: {
          where: { verification_status: 'VERIFIED' },
          select: {
            id: true,
            document_type: true,
            verification_status: true
          }
        },
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
  const isOwner = user && user.role === 'STARTUP';
  const isAdmin = user && user.role === 'ADMIN';

  const startup = await prisma.startup.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_verified: true
        }
      },
      documents: true,
      bank_details: true,
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

  const isSelf = user && startup.user_id === user.id;

  // SENSITIVE BANK DATA PROTECTION:
  // If requester is not the startup owner and not an Admin, strip sensitive bank details
  if (!isAdmin && !isSelf) {
    const { bank_details, ...sanitized } = startup;
    return {
      ...sanitized,
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

  // If startup is SUBMITTED, UNDER_REVIEW or VERIFIED, profile editing is locked for non-admins
  if (user.role !== 'ADMIN' && ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(startup.verification_status)) {
    throw new BadRequestError(`Your registration is currently ${startup.verification_status.replace('_', ' ').toLowerCase()}. Profile editing is locked until review completes.`);
  }

  // Reject client attempts to modify server-controlled verification fields
  const forbiddenVerificationFields = [
    'verification_status',
    'verification_source',
    'verified_by',
    'verified_at',
    'reviewed_by',
    'reviewed_at'
  ];
  for (const field of forbiddenVerificationFields) {
    if (user.role !== 'ADMIN' && data[field] !== undefined) {
      throw new ForbiddenError(`Client cannot modify restricted verification field: ${field}`);
    }
  }

  // Whitelist allowable update fields
  const allowedFields = [
    'company_name',
    'org_type',
    'registered_address',
    'city',
    'state',
    'pincode',
    'official_email',
    'official_website',
    'authorized_person_name',
    'authorized_person_designation',
    'authorized_person_email',
    'authorized_person_phone',
    'authorization_type',
    'pan_number',
    'cin_number',
    'gstin',
    'dpiit_number',
    'certificate_number',
    'registration_number',
    'incorporation_date',
    'description',
    'domain',
    'technologies',
    'products_services',
    'readiness_level',
    'years_experience',
    'previous_deployments',
    'location',
    'phone'
  ];

  // Map address_line1 / address_line2 to registered_address if provided
  if (!data.registered_address && (data.address_line1 || data.address_line2)) {
    data.registered_address = [data.address_line1, data.address_line2].filter(Boolean).join(', ');
  }

  // Map trl alias to readiness_level if provided
  if (data.trl !== undefined && data.readiness_level === undefined) {
    data.readiness_level = data.trl;
  }

  // If user phone is provided, sync to User record
  if (data.phone !== undefined && startup.user_id) {
    const cleanPhone = data.phone ? String(data.phone).trim() : null;
    await prisma.user.update({
      where: { id: startup.user_id },
      data: { phone: cleanPhone }
    });
  }

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'incorporation_date') {
        updateData[field] = data[field] ? new Date(data[field]) : null;
      } else if (field === 'pan_number') {
        updateData[field] = data[field] ? data[field].trim().toUpperCase() : null;
      } else if (field === 'cin_number' || field === 'gstin' || field === 'dpiit_number') {
        updateData[field] = data[field] ? data[field].trim().toUpperCase() : null;
      } else if (typeof data[field] === 'string') {
        updateData[field] = data[field].trim();
      } else {
        updateData[field] = data[field];
      }
    }
  }

  // Location Validation: State/UT and City
  if (data.state !== undefined || data.city !== undefined) {
    const targetState = data.state !== undefined
      ? (data.state && typeof data.state === 'string' ? data.state.trim() : null)
      : startup.state;
    const targetCity = data.city !== undefined
      ? (data.city && typeof data.city === 'string' ? data.city.trim() : null)
      : startup.city;

    if (targetState) {
      if (!isValidState(targetState)) {
        throw new BadRequestError(`Invalid State / UT '${targetState}'. Please select a canonical Indian State or Union Territory.`);
      }
      updateData.state = targetState;
    } else if (data.state !== undefined) {
      updateData.state = null;
    }

    if (targetCity) {
      if (!targetState) {
        throw new BadRequestError('Cannot select city without selecting a valid State / UT.');
      }
      if (!isValidCityForState(targetState, targetCity)) {
        throw new BadRequestError(`Invalid city '${targetCity}' for State / UT '${targetState}'. Please select a canonical city belonging to ${targetState}.`);
      }
      updateData.city = getCanonicalCityName(targetState, targetCity) || targetCity;
    } else if (data.city !== undefined) {
      updateData.city = null;
    }
  }

  // Postal PIN Code Validation
  if (data.pincode !== undefined) {
    if (data.pincode === null || data.pincode === '') {
      updateData.pincode = null;
    } else {
      const pinStr = String(data.pincode).trim();
      if (!PATTERNS.PINCODE.test(pinStr)) {
        throw new BadRequestError('Postal PIN code must be exactly 6 numeric digits (e.g. 560001).');
      }
      updateData.pincode = pinStr;
    }
  }

  // Technologies Validation and Normalization
  if (data.technologies !== undefined) {
    if (!Array.isArray(data.technologies)) {
      throw new BadRequestError('Technologies must be an array of strings.');
    }
    const cleanTechs = [];
    const seenLower = new Set();
    for (const item of data.technologies) {
      if (typeof item !== 'string') {
        throw new BadRequestError('All technology items must be strings.');
      }
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (trimmed.length > 80) {
        throw new BadRequestError('Technology item exceeds maximum allowed length of 80 characters.');
      }
      if (!seenLower.has(trimmed.toLowerCase())) {
        seenLower.add(trimmed.toLowerCase());
        cleanTechs.push(trimmed);
      }
    }
    if (cleanTechs.length > 50) {
      throw new BadRequestError('Cannot specify more than 50 technologies.');
    }
    updateData.technologies = cleanTechs;
  }

  // Duplicate / Race condition checks for active registrations
  if (updateData.pan_number) {
    const conflict = await prisma.startup.findFirst({
      where: {
        pan_number: updateData.pan_number,
        id: { not: id },
        verification_status: { not: 'REJECTED' }
      }
    });
    if (conflict) {
      throw new ConflictError(`An active startup registration already exists with PAN ${updateData.pan_number}.`);
    }
  }

  if (updateData.cin_number) {
    const conflict = await prisma.startup.findFirst({
      where: {
        cin_number: updateData.cin_number,
        id: { not: id },
        verification_status: { not: 'REJECTED' }
      }
    });
    if (conflict) {
      throw new ConflictError(`An active startup registration already exists with CIN ${updateData.cin_number}.`);
    }
  }

  if (updateData.gstin) {
    const conflict = await prisma.startup.findFirst({
      where: {
        gstin: updateData.gstin,
        id: { not: id },
        verification_status: { not: 'REJECTED' }
      }
    });
    if (conflict) {
      throw new ConflictError(`An active startup registration already exists with GSTIN ${updateData.gstin}.`);
    }
  }

  if (updateData.dpiit_number) {
    const conflict = await prisma.startup.findFirst({
      where: {
        dpiit_number: updateData.dpiit_number,
        id: { not: id },
        verification_status: { not: 'REJECTED' }
      }
    });
    if (conflict) {
      throw new ConflictError(`An active startup registration already exists with DPIIT Number ${updateData.dpiit_number}.`);
    }
  }

  // If startup was previously CORRECTION_REQUESTED, editing resets it to DRAFT until resubmitted
  if (startup.verification_status === 'CORRECTION_REQUESTED') {
    updateData.verification_status = 'DRAFT';
  }

  if (updateData.domain) {
    updateData.domain = normalizeDomain(updateData.domain);
  }

  const updated = await prisma.startup.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          is_verified: true
        }
      },
      documents: true,
      bank_details: true
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

  // Step 4: Dynamically update candidate pools for published challenges if verified startup updated capabilities
  if (updated.verification_status === 'VERIFIED' && (updateData.technologies || updateData.readiness_level || updateData.years_experience || updateData.previous_deployments || updateData.domain)) {
    refreshMatchingForPublishedChallenges(updated.id).catch((err) => {
      logger.warn(`Candidate pool refresh on profile update for startup ${updated.id} deferred: ${err.message}`);
    });
  }

  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_PROFILE_UPDATED',
    entity_type: 'STARTUP',
    entity_id: id,
    details: { changes: updateData },
    ip_address
  });

  return updated;
};

/**
 * Save or update sensitive bank details for a startup
 */
export const saveBankDetails = async (startupId, data, user, ip_address = null) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  if (user.role !== 'ADMIN' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only update bank details for your own startup.');
  }

  // If startup is SUBMITTED, UNDER_REVIEW or VERIFIED, bank editing is locked for non-admins
  if (user.role !== 'ADMIN' && ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(startup.verification_status)) {
    throw new BadRequestError(`Your registration is currently ${startup.verification_status.replace('_', ' ').toLowerCase()}. Bank details updates are locked.`);
  }

  // Format validations
  const ifsc = data.ifsc_code.trim().toUpperCase();
  let accNo = data.account_number ? data.account_number.trim() : '';

  if (!PATTERNS.IFSC.test(ifsc)) {
    throw new BadRequestError('Invalid IFSC code format (e.g. SBIN0001234).');
  }

  const existingBank = await prisma.startupBankDetails.findUnique({ where: { startup_id: startupId } });

  if (accNo.includes('•') || accNo.includes('*')) {
    if (existingBank) {
      accNo = existingBank.account_number;
    } else {
      throw new BadRequestError('Account number must be between 9 and 18 digits.');
    }
  } else if (!/^\d{9,18}$/.test(accNo)) {
    throw new BadRequestError('Account number must be between 9 and 18 digits.');
  }

  // Encrypt account number before persisting to PostgreSQL
  const encryptedAccNo = isEncrypted(accNo) ? accNo : encryptString(accNo);

  const bankDetails = await prisma.startupBankDetails.upsert({
    where: { startup_id: startupId },
    create: {
      startup_id: startupId,
      account_holder_name: data.account_holder_name.trim(),
      bank_name: data.bank_name.trim(),
      account_number: encryptedAccNo,
      ifsc_code: ifsc,
      branch_name: data.branch_name ? data.branch_name.trim() : null,
      account_type: data.account_type || 'CURRENT'
    },
    update: {
      account_holder_name: data.account_holder_name.trim(),
      bank_name: data.bank_name.trim(),
      account_number: encryptedAccNo,
      ifsc_code: ifsc,
      branch_name: data.branch_name ? data.branch_name.trim() : null,
      account_type: data.account_type || 'CURRENT'
    }
  });

  // Mask account number in audit log to prevent sensitive data leakage
  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_BANK_DETAILS_SAVED',
    entity_type: 'STARTUP_BANK_DETAILS',
    entity_id: bankDetails.id,
    details: {
      startup_id: startupId,
      bank_name: bankDetails.bank_name,
      account_type: bankDetails.account_type,
      account_number_masked: maskAccountNumber(bankDetails.account_number),
      ifsc_code: bankDetails.ifsc_code
    },
    ip_address
  });

  const isAdminUser = user && user.role === 'ADMIN';

  return {
    ...bankDetails,
    account_number: isAdminUser ? decryptString(bankDetails.account_number) : maskAccountNumber(bankDetails.account_number),
    masked_account_number: maskAccountNumber(bankDetails.account_number)
  };
};

/**
 * Retrieve sensitive bank details for an authorized requester (Owner or Admin only)
 */
export const getBankDetails = async (startupId, user) => {
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    include: { bank_details: true }
  });

  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  const isOwner = user && startup.user_id === user.id;
  const isAdmin = user && user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You are not authorized to view bank details for this startup.');
  }

  if (!startup.bank_details) {
    throw new NotFoundError('Bank details have not been registered for this startup.');
  }

  return {
    ...startup.bank_details,
    account_number: isAdmin || isOwner ? decryptString(startup.bank_details.account_number) : maskAccountNumber(startup.bank_details.account_number),
    masked_account_number: maskAccountNumber(startup.bank_details.account_number)
  };
};

export const addStartupDocument = async (startupId, data, user, ip_address = null) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  if (user.role !== 'ADMIN' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only upload documents for your own startup profile.');
  }

  // If startup is SUBMITTED, UNDER_REVIEW or VERIFIED, document uploading is locked for non-admins unless correction requested
  if (user.role !== 'ADMIN' && ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(startup.verification_status)) {
    throw new BadRequestError(`Your registration is currently ${startup.verification_status.replace('_', ' ').toLowerCase()}. Document uploads are locked.`);
  }

  // Strict upload validation: Reject arbitrary external client URLs
  let docUrl = data.document_url ? data.document_url.trim() : '';
  if (docUrl.startsWith('http://') || docUrl.startsWith('https://')) {
    try {
      const parsed = new URL(docUrl);
      if (parsed.pathname.startsWith('/api/v1/documents/') || parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/api/v1/uploads/')) {
        docUrl = parsed.pathname;
      } else if (parsed.hostname === 'setugov.in' || process.env.NODE_ENV === 'test') {
        docUrl = parsed.pathname;
      } else {
        throw new BadRequestError('Invalid document URL. External URLs are not permitted.');
      }
    } catch (e) {
      if (e instanceof BadRequestError) throw e;
      throw new BadRequestError('Invalid document URL format.');
    }
  }

  if (!docUrl || docUrl.startsWith('//') || docUrl.startsWith('data:') || (!docUrl.startsWith('/uploads/') && !docUrl.startsWith('/api/v1/uploads/') && !docUrl.startsWith('/api/v1/documents/') && !docUrl.startsWith('/docs/'))) {
    throw new BadRequestError('Invalid document URL. Files must be uploaded through the secure platform upload endpoint.');
  }

  const document = await prisma.startupDocument.create({
    data: {
      startup_id: startupId,
      document_type: data.document_type.trim(),
      document_url: docUrl,
      file_name: data.file_name ? data.file_name.trim() : null,
      file_size: data.file_size || null,
      mime_type: data.mime_type ? data.mime_type.trim() : null,
      verification_status: 'PENDING'
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_DOCUMENT_UPLOADED',
    entity_type: 'STARTUP_DOCUMENT',
    entity_id: document.id,
    details: {
      startup_id: startupId,
      document_type: document.document_type,
      file_name: document.file_name
    },
    ip_address
  });

  return document;
};

export const deleteStartupDocument = async (startupId, documentId, user, ip_address = null) => {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) throw new NotFoundError(`Startup with ID ${startupId} not found.`);

  if (user.role !== 'ADMIN' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only delete documents for your own startup.');
  }

  if (user.role !== 'ADMIN' && ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'].includes(startup.verification_status)) {
    throw new BadRequestError(`Your registration is currently ${startup.verification_status.replace('_', ' ').toLowerCase()}. Document deletion is locked.`);
  }

  const document = await prisma.startupDocument.findUnique({ where: { id: documentId } });
  if (!document || document.startup_id !== startupId) {
    throw new NotFoundError('Document not found for this startup.');
  }

  await prisma.startupDocument.delete({ where: { id: documentId } });

  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_DOCUMENT_DELETED',
    entity_type: 'STARTUP_DOCUMENT',
    entity_id: documentId,
    details: { startup_id: startupId, document_type: document.document_type },
    ip_address
  });

  return { success: true, message: 'Document removed successfully.' };
};

export const getStartupDocuments = async (startupId, user = null) => {
  if (!user) {
    throw new ForbiddenError('Authentication required to access startup documents.');
  }

  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  // Resource-Level Authorization Policy
  if (user.role === 'ADMIN') {
    // Admin authorized
  } else if (user.role === 'STARTUP') {
    if (startup.user_id !== user.id) {
      throw new ForbiddenError('You can only view documents for your own startup profile.');
    }
  } else if (user.role === 'GOVERNMENT') {
    if (!user.department_id) {
      throw new ForbiddenError('Government officer must have an assigned department.');
    }
    const hasRelationship = await prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: {
          startup_id: startupId,
          challenge: { department_id: user.department_id }
        }
      });
      if (app) return true;
      const pilot = await tx.pilot.findFirst({
        where: {
          startup_id: startupId,
          challenge: { department_id: user.department_id }
        }
      });
      if (pilot) return true;
      const proc = await tx.procurementRecord.findFirst({
        where: {
          startup_id: startupId,
          department_id: user.department_id
        }
      });
      return !!proc;
    });
    if (!hasRelationship) {
      throw new ForbiddenError('You do not have authorization to view documents for this startup.');
    }
  } else if (user.role === 'EVALUATOR') {
    const assigned = await prisma.evaluatorAssignment.findFirst({
      where: {
        evaluator_id: user.id,
        application: { startup_id: startupId }
      }
    });
    if (!assigned) {
      throw new ForbiddenError('You do not have an active assignment to evaluate this startup.');
    }
  } else {
    throw new ForbiddenError('Unauthorized to view startup documents.');
  }

  const documents = await prisma.startupDocument.findMany({
    where: { startup_id: startupId },
    orderBy: { created_at: 'desc' }
  });

  return documents;
};

/**
 * Submit GeM-style startup registration for Administrative Verification
 */
export const submitStartupRegistration = async (startupId, dataOrUser, userOrIp = null, ipAddress = null) => {
  let data = {};
  let user = dataOrUser;
  let ip_address = userOrIp;

  if (dataOrUser && dataOrUser.role === undefined && typeof dataOrUser === 'object') {
    data = dataOrUser;
    user = userOrIp;
    ip_address = ipAddress;
  }

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    include: {
      documents: true,
      bank_details: true,
      user: true
    }
  });

  if (!startup) throw new NotFoundError(`Startup with ID ${startupId} not found.`);

  if (user.role !== 'ADMIN' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only submit registration for your own startup.');
  }

  // Email verification guard
  if (!startup.user.is_verified) {
    throw new BadRequestError('Please verify your email address before submitting your registration dossier.');
  }

  // 1. Completeness Validation
  const missing = [];
  if (!startup.company_name || startup.company_name.length < 2) missing.push('Organization Legal Name');
  if (!startup.org_type || !['PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'TRUST', 'SOCIETY', 'ASSOCIATION', 'OTHER'].includes(startup.org_type)) {
    missing.push('Valid Organization Type');
  }
  if (!startup.registered_address || !startup.city || !startup.state || !startup.pincode) {
    missing.push('Registered Address & Location (Street, City, State, PIN)');
  } else {
    if (!isValidState(startup.state)) {
      missing.push(`Invalid State / UT '${startup.state}'. Please select a canonical Indian State or Union Territory`);
    }
    if (!isValidCityForState(startup.state, startup.city)) {
      missing.push(`Invalid City '${startup.city}' for State / UT '${startup.state}'`);
    }
    if (!PATTERNS.PINCODE.test(startup.pincode)) {
      missing.push('Postal PIN Code must be exactly 6 numeric digits');
    }
  }
  if (!startup.authorized_person_name || !startup.authorized_person_email || !startup.authorized_person_phone) {
    missing.push('Authorized Person Details (Name, Email, Phone)');
  }
  if (!startup.pan_number || !PATTERNS.PAN.test(startup.pan_number)) {
    missing.push('Valid Business PAN Number');
  }
  if (!startup.bank_details || !startup.bank_details.account_number || !startup.bank_details.ifsc_code) {
    missing.push('Bank Account Details for Procurement/Payments');
  }
  if (data && data.declaration_accepted === false) {
    missing.push('Truthfulness declaration must be accepted');
  }

  // Enforce entity-specific required documents
  const requiredDocs = getRequiredDocumentTypes(startup.org_type);
  const uploadedDocTypes = new Set((startup.documents || []).map(d => d.document_type.toUpperCase()));

  const missingDocs = requiredDocs.filter(t => !uploadedDocTypes.has(t.toUpperCase()));
  if (missingDocs.length > 0) {
    missing.push(`Missing required verification documents for ${startup.org_type}: ${missingDocs.join(', ')}`);
  }

  // Check for rejected documents that need correction
  const rejectedDocs = (startup.documents || []).filter(d => d.verification_status === 'REJECTED');
  if (rejectedDocs.length > 0) {
    missing.push(`One or more documents were previously rejected and need to be re-uploaded: ${rejectedDocs.map(d => d.document_type).join(', ')}`);
  }

  if (missing.length > 0) {
    throw new BadRequestError(`Registration submission incomplete. Please complete: ${missing.join('; ')}`);
  }

  // 2. Transition state to SUBMITTED
  const updatedStartup = await prisma.startup.update({
    where: { id: startupId },
    data: {
      verification_status: 'SUBMITTED',
      submitted_at: new Date(),
      rejection_reason: null,
      correction_notes: null
    },
    include: {
      documents: true,
      bank_details: true
    }
  });

  // Notify Admins efficiently in a single bulk query
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true }, take: 10 });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map(a => ({
        user_id: a.id,
        title: 'New Startup Verification Submission',
        message: `${startup.company_name} has submitted registration dossier for GeM-style verification.`,
        type: 'VERIFICATION',
        link: '/admin/startups',
        is_read: false
      }))
    });
  }

  await createAuditLog({
    user_id: user.id,
    action: 'STARTUP_REGISTRATION_SUBMITTED',
    entity_type: 'STARTUP',
    entity_id: startupId,
    details: {
      company_name: startup.company_name,
      org_type: startup.org_type,
      pan_number: startup.pan_number,
      document_count: startup.documents.length
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

  // Step 4: Dynamically update candidate pools for published challenges when startup is verified
  if (data.verification_status === 'VERIFIED') {
    refreshMatchingForPublishedChallenges(startupId).catch((err) => {
      logger.warn(`Candidate pool refresh on verification for startup ${startupId} deferred: ${err.message}`);
    });
  }

  return updatedStartup;
};

/**
 * Legacy startup verification endpoint - delegates directly to authoritative admin review state machine
 */
export const verifyStartup = async (startupId, data, user, ip_address = null) => {
  const { reviewStartupVerification } = await import('./adminService.js');
  let action = data.action;
  if (!action) {
    if (data.verification_status === 'VERIFIED') action = 'APPROVE';
    else if (data.verification_status === 'REJECTED') action = 'REJECT';
    else if (data.verification_status === 'CORRECTION_REQUESTED') action = 'REQUEST_CORRECTION';
    else if (data.verification_status === 'UNDER_REVIEW') action = 'START_REVIEW';
    else action = 'START_REVIEW';
  }
  return reviewStartupVerification(
    startupId,
    {
      action,
      notes: data.comments || data.notes || data.verification_notes,
      rejection_reason: data.rejection_reason,
      correction_notes: data.correction_notes
    },
    user,
    ip_address
  );
};

const resolveStartupRecord = async (startupId, user) => {
  if (!startupId || startupId === 'my' || startupId === 'me' || startupId === 'undefined' || startupId === 'null') {
    if (user && user.role === 'STARTUP') {
      const startup = await prisma.startup.findFirst({ where: { user_id: user.id } });
      if (!startup) {
        throw new NotFoundError('No registered startup profile found for this user account.');
      }
      return startup;
    }
    throw new BadRequestError('A valid startup ID must be provided.');
  }

  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    throw new NotFoundError(`Startup with ID ${startupId} not found.`);
  }

  if (user && user.role === 'STARTUP' && startup.user_id !== user.id) {
    throw new ForbiddenError('You can only view your own startup records.');
  }

  return startup;
};

export const getStartupApplications = async (startupId, user = null) => {
  const startup = await resolveStartupRecord(startupId, user);

  return prisma.application.findMany({
    where: { startup_id: startup.id },
    include: {
      challenge: {
        include: {
          department: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });
};

export const getStartupPilots = async (startupId, user = null) => {
  const startup = await resolveStartupRecord(startupId, user);

  return prisma.pilot.findMany({
    where: { startup_id: startup.id },
    include: {
      challenge: true,
      department: true,
      milestones: true
    },
    orderBy: { created_at: 'desc' }
  });
};

export const getStartupPerformance = async (startupId, user = null) => {
  const startup = await resolveStartupRecord(startupId, user);

  const startupWithPilots = await prisma.startup.findUnique({
    where: { id: startup.id },
    include: {
      pilots: {
        include: {
          validations: true,
          scale_decisions: true,
          payments: true
        }
      }
    }
  });

  const pilots = startupWithPilots?.pilots || [];
  const completedPilots = pilots.filter(p => p.status === 'COMPLETED' || p.status === 'SCALED');
  const validations = pilots.flatMap(p => p.validations);

  const avgScore = validations.length > 0
    ? validations.reduce((sum, v) => sum + v.performance_score, 0) / validations.length
    : 0;

  return {
    total_pilots: pilots.length,
    completed_pilots: completedPilots.length,
    average_validation_score: Number(avgScore.toFixed(2)),
    scale_ready_count: pilots.filter(p => p.status === 'SCALED').length
  };
};

export default {
  createStartup,
  getMyRegistration,
  getStartups,
  getStartupById,
  updateStartup,
  saveBankDetails,
  getBankDetails,
  addStartupDocument,
  deleteStartupDocument,
  getStartupDocuments,
  submitStartupRegistration,
  verifyStartup,
  getStartupApplications,
  getStartupPilots,
  getStartupPerformance
};
