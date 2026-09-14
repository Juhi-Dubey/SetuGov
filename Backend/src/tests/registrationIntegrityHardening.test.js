import assert from 'assert';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';

const BASE_URL = 'http://localhost:5000/api/v1';
const generateToken = (payload) => jwt.sign({ userId: payload.id || payload.userId, role: payload.role, email: payload.email, ...payload }, config.JWT_SECRET, { expiresIn: '1h' });
const getErrMsg = (data) => data?.error?.message || data?.message || JSON.stringify(data);

async function runRegistrationIntegrityHardeningTests() {
  console.log('===============================================================');
  console.log('🛡️ RUNNING REGISTRATION + INTEGRITY HARDENING TEST SUITE (SETUGOV-10)');
  console.log('===============================================================');

  const uniqueSuffix = Date.now();
  const strongPassword = 'Password123!@#Secure';

  // Seed / setup test users & tokens
  const adminEmail = `admin_test_${uniqueSuffix}@setugov.gov.in`;
  const govEmail = `gov_test_${uniqueSuffix}@karnataka.gov.in`;
  const evalEmail = `eval_test_${uniqueSuffix}@iisc.ac.in`;
  const startup1Email = `pvt_ltd_${uniqueSuffix}@startup.in`;
  const startup2Email = `prop_${uniqueSuffix}@startup.in`;

  // Create Admin User
  const adminPasswordHash = await bcrypt.hash(strongPassword, 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Test Administrator',
      email: adminEmail,
      password_hash: adminPasswordHash,
      role: 'ADMIN',
      is_active: true,
      is_verified: true,
    }
  });
  const adminToken = generateToken({ id: adminUser.id, role: adminUser.role, email: adminUser.email });

  // Create Department & Government User
  const dept = await prisma.department.create({
    data: {
      name: `Dept of Health & Tech ${uniqueSuffix}`,
      state: 'Karnataka',
      nodal_officer_name: 'Dr. Ramesh Nodal',
      contact_email: govEmail,
      verification_status: 'VERIFIED'
    }
  });

  const govUser = await prisma.user.create({
    data: {
      name: 'Nodal Officer Gov',
      email: govEmail,
      password_hash: adminPasswordHash,
      role: 'GOVERNMENT',
      department_id: dept.id,
      is_active: true,
      is_verified: true,
    }
  });
  const govToken = generateToken({ id: govUser.id, role: govUser.role, email: govUser.email, department_id: dept.id });

  // Create Evaluator User
  const evalUser = await prisma.user.create({
    data: {
      name: 'Expert Evaluator',
      email: evalEmail,
      password_hash: adminPasswordHash,
      role: 'EVALUATOR',
      is_active: true,
      is_verified: true,
    }
  });
  const evalToken = generateToken({ id: evalUser.id, role: evalUser.role, email: evalUser.email });

  // Create Startup 1 (Private Limited)
  const startupUser1 = await prisma.user.create({
    data: {
      name: 'Pvt Ltd Founder',
      email: startup1Email,
      password_hash: adminPasswordHash,
      role: 'STARTUP',
      is_active: true,
      is_verified: true,
      email_verified_at: new Date(),
    }
  });
  const startup1 = await prisma.startup.create({
    data: {
      user_id: startupUser1.id,
      company_name: `Alpha Innovations Pvt Ltd ${uniqueSuffix}`,
      org_type: 'PRIVATE_LIMITED',
      verification_status: 'DRAFT',
      description: 'Alpha enterprise solutions for public health',
      domain: 'Healthcare & MedTech',
      location: 'Bengaluru, Karnataka',
    }
  });
  const startup1Token = generateToken({ id: startupUser1.id, role: startupUser1.role, email: startupUser1.email, startup_id: startup1.id });

  // Create Startup 2 (Sole Proprietorship)
  const startupUser2 = await prisma.user.create({
    data: {
      name: 'Proprietor Founder',
      email: startup2Email,
      password_hash: adminPasswordHash,
      role: 'STARTUP',
      is_active: true,
      is_verified: true,
      email_verified_at: new Date(),
    }
  });
  const startup2 = await prisma.startup.create({
    data: {
      user_id: startupUser2.id,
      company_name: `Beta Tech Works ${uniqueSuffix}`,
      org_type: 'PROPRIETORSHIP',
      verification_status: 'DRAFT',
      description: 'Beta tech services for municipal bodies',
      domain: 'Urban Governance & Smart Cities',
      location: 'Mysuru, Karnataka',
    }
  });
  const startup2Token = generateToken({ id: startupUser2.id, role: startupUser2.role, email: startupUser2.email, startup_id: startup2.id });

  // -------------------------------------------------------------------------
  // TEST 1: Entity-Specific Mandatory Document Enforcement
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Mandatory Document Enforcement per Entity Type ---');

  // Fill in required basic profile details for Startup 1 (Private Limited)
  const pan1 = `AAACP${String(uniqueSuffix).slice(-4)}A`;
  await prisma.startup.update({
    where: { id: startup1.id },
    data: {
      registered_address: '123 Tech Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      pan_number: pan1,
      authorized_person_name: 'Pvt Ltd Founder',
      authorized_person_designation: 'Managing Director',
      authorized_person_email: startup1Email,
      authorized_person_phone: '9876543210',
    }
  });

  // Save bank details for Startup 1 via API endpoint to also test audit log generation
  const saveBankRes1 = await fetch(`${BASE_URL}/startups/${startup1.id}/bank-details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup1Token}`,
    },
    body: JSON.stringify({
      account_holder_name: startup1.company_name,
      bank_name: 'State Bank of India',
      account_number: '12345678901234',
      ifsc_code: 'SBIN0001234',
      account_type: 'CURRENT',
    }),
  });
  assert.strictEqual(saveBankRes1.status, 200, 'Saving bank details must succeed');

  // Try submitting without required documents (Private Limited requires PAN, INCORPORATION_CERTIFICATE, BANK_PROOF, AUTHORIZED_PERSON_PROOF)
  const missingDocsSubmitRes = await fetch(`${BASE_URL}/startups/${startup1.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup1Token}`,
    },
    body: JSON.stringify({ declaration_accepted: true }),
  });
  const missingDocsData = await missingDocsSubmitRes.json();
  const errMsg = getErrMsg(missingDocsData);
  assert.strictEqual(missingDocsSubmitRes.status, 400, 'Submission without mandatory documents must be rejected with 400');
  assert(errMsg.includes('Missing required verification documents'), 'Error message must list missing documents');
  console.log('✅ Incomplete documents submission rejected for PRIVATE_LIMITED:', errMsg);

  // Upload only PAN and BANK_PROOF (still missing INCORPORATION_CERTIFICATE and AUTHORIZED_PERSON_PROOF)
  await prisma.startupDocument.createMany({
    data: [
      { startup_id: startup1.id, document_type: 'PAN', file_name: 'pan.pdf', document_url: '/uploads/private/pan.pdf', file_size: 1024, mime_type: 'application/pdf' },
      { startup_id: startup1.id, document_type: 'BANK_PROOF', file_name: 'cheque.pdf', document_url: '/uploads/private/cheque.pdf', file_size: 1024, mime_type: 'application/pdf' },
    ]
  });

  const partialDocsSubmitRes = await fetch(`${BASE_URL}/startups/${startup1.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup1Token}`,
    },
    body: JSON.stringify({ declaration_accepted: true }),
  });
  assert.strictEqual(partialDocsSubmitRes.status, 400, 'Partial documents submission must be rejected');
  console.log('✅ Partial documents submission rejected for PRIVATE_LIMITED');

  // Upload remaining documents for PRIVATE_LIMITED
  await prisma.startupDocument.createMany({
    data: [
      { startup_id: startup1.id, document_type: 'INCORPORATION_CERTIFICATE', file_name: 'incorp.pdf', document_url: '/uploads/private/incorp.pdf', file_size: 1024, mime_type: 'application/pdf' },
      { startup_id: startup1.id, document_type: 'AUTHORIZED_PERSON_PROOF', file_name: 'board_res.pdf', document_url: '/uploads/private/board_res.pdf', file_size: 1024, mime_type: 'application/pdf' },
    ]
  });

  // Now submit Startup 1 -> Must succeed and transition to SUBMITTED
  const fullDocsSubmitRes = await fetch(`${BASE_URL}/startups/${startup1.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup1Token}`,
    },
    body: JSON.stringify({ declaration_accepted: true }),
  });
  const fullDocsData = await fullDocsSubmitRes.json();
  assert.strictEqual(fullDocsSubmitRes.status, 200, 'Submission with all required documents must succeed');
  assert.strictEqual(fullDocsData.data.startup.verification_status, 'SUBMITTED', 'Status must transition to SUBMITTED');
  console.log('✅ Full documents submission succeeded for PRIVATE_LIMITED -> SUBMITTED');

  // Test PROPRIETORSHIP (Startup 2): requires only PAN, BANK_PROOF, AUTHORIZED_PERSON_PROOF (no INCORPORATION_CERTIFICATE required)
  const pan2 = `BBBCP${String(uniqueSuffix).slice(-4)}B`;
  await prisma.startup.update({
    where: { id: startup2.id },
    data: {
      registered_address: '456 Market St',
      city: 'Mysuru',
      state: 'Karnataka',
      pincode: '570001',
      pan_number: pan2,
      authorized_person_name: 'Proprietor Founder',
      authorized_person_designation: 'Sole Proprietor',
      authorized_person_email: startup2Email,
      authorized_person_phone: '9876543211',
    }
  });

  const saveBankRes2 = await fetch(`${BASE_URL}/startups/${startup2.id}/bank-details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup2Token}`,
    },
    body: JSON.stringify({
      account_holder_name: startup2.company_name,
      bank_name: 'HDFC Bank',
      account_number: '98765432109876',
      ifsc_code: 'HDFC0001234',
      account_type: 'SAVINGS',
    }),
  });
  assert.strictEqual(saveBankRes2.status, 200, 'Saving bank details for startup 2 must succeed');
  await prisma.startupDocument.createMany({
    data: [
      { startup_id: startup2.id, document_type: 'PAN', file_name: 'pan2.pdf', document_url: '/uploads/private/pan2.pdf', file_size: 1024, mime_type: 'application/pdf' },
      { startup_id: startup2.id, document_type: 'BANK_PROOF', file_name: 'passbook.pdf', document_url: '/uploads/private/passbook.pdf', file_size: 1024, mime_type: 'application/pdf' },
      { startup_id: startup2.id, document_type: 'AUTHORIZED_PERSON_PROOF', file_name: 'prop_id.pdf', document_url: '/uploads/private/prop_id.pdf', file_size: 1024, mime_type: 'application/pdf' },
    ]
  });

  const propSubmitRes = await fetch(`${BASE_URL}/startups/${startup2.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup2Token}`,
    },
    body: JSON.stringify({ declaration_accepted: true }),
  });
  assert.strictEqual(propSubmitRes.status, 200, 'Proprietorship submission without incorporation certificate must succeed');
  console.log('✅ Entity-specific document requirements validated for PROPRIETORSHIP');

  // -------------------------------------------------------------------------
  // TEST 2: Admin-Only Verification Authorization (Government/Evaluator Denied)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Admin-Only Verification Privileges ---');

  // Government officer attempts to start review or approve -> HTTP 403 Forbidden
  const govVerifyRes = await fetch(`${BASE_URL}/startups/${startup1.id}/verification`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${govToken}`,
    },
    body: JSON.stringify({ action: 'START_REVIEW' }),
  });
  assert.strictEqual(govVerifyRes.status, 403, 'Government officer must be denied verification access with 403');
  console.log('✅ Government officer correctly denied verification permission (HTTP 403)');

  // Evaluator attempts verification -> HTTP 403 Forbidden
  const evalVerifyRes = await fetch(`${BASE_URL}/startups/${startup1.id}/verification`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${evalToken}`,
    },
    body: JSON.stringify({ action: 'START_REVIEW' }),
  });
  assert.strictEqual(evalVerifyRes.status, 403, 'Evaluator must be denied verification access with 403');
  console.log('✅ Evaluator correctly denied verification permission (HTTP 403)');

  // Admin executes START_REVIEW -> Must succeed (SUBMITTED -> UNDER_REVIEW)
  const adminReviewRes = await fetch(`${BASE_URL}/admin/startup-verifications/${startup1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ action: 'START_REVIEW' }),
  });
  const adminReviewData = await adminReviewRes.json();
  assert.strictEqual(adminReviewRes.status, 200, 'Admin START_REVIEW must succeed');
  assert.strictEqual(adminReviewData.data.startup.verification_status, 'UNDER_REVIEW', 'Status must be UNDER_REVIEW');
  console.log('✅ Admin successfully placed dossier UNDER_REVIEW');

  // -------------------------------------------------------------------------
  // TEST 3: Verification State Machine & Dossier Modification Locking
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: State Machine Rules & Modification Locking ---');

  // Attempt to modify startup profile while UNDER_REVIEW -> Must return HTTP 400 Bad Request
  const lockedEditRes = await fetch(`${BASE_URL}/startups/${startup1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup1Token}`,
    },
    body: JSON.stringify({ company_name: 'Modified Name Attempt' }),
  });
  assert.strictEqual(lockedEditRes.status, 400, 'Editing profile while UNDER_REVIEW must be blocked with 400');
  console.log('✅ Dossier modification locked while UNDER_REVIEW (HTTP 400)');

  // Admin approves verification -> UNDER_REVIEW -> VERIFIED
  const adminApproveRes = await fetch(`${BASE_URL}/admin/startup-verifications/${startup1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ action: 'APPROVE', notes: 'All statutory documents cross-verified' }),
  });
  const adminApproveData = await adminApproveRes.json();
  assert.strictEqual(adminApproveRes.status, 200, 'Admin APPROVE must succeed');
  assert.strictEqual(adminApproveData.data.startup.verification_status, 'VERIFIED', 'Status must be VERIFIED');
  console.log('✅ Admin successfully APPROVED startup dossier -> VERIFIED');

  // -------------------------------------------------------------------------
  // TEST 4: Sensitive Bank Account Masking & Audit Log Protection
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Bank Account Protection & Data Masking ---');

  // Inspect startup registration response -> Bank account number must be masked in general queries
  const getRegRes = await fetch(`${BASE_URL}/startups/my-registration`, {
    headers: { Authorization: `Bearer ${startup1Token}` },
  });
  const getRegData = await getRegRes.json();
  assert(getRegData.data.startup.bank_details.masked_account_number, 'Masked account number must be provided');
  assert.strictEqual(getRegData.data.startup.bank_details.masked_account_number.startsWith('****'), true, 'Account number must be masked');
  console.log('✅ Bank details masked:', getRegData.data.startup.bank_details.masked_account_number);

  // Check audit log for bank details creation
  const bankAuditLogs = await prisma.auditLog.findMany({
    where: { entity_type: 'STARTUP_BANK_DETAILS', entity_id: getRegData.data.startup.bank_details.id }
  });
  for (const log of bankAuditLogs) {
    const detailsStr = JSON.stringify(log.details);
    assert(!detailsStr.includes('12345678901234'), 'AuditLog must NEVER contain raw bank account numbers');
    assert(detailsStr.includes('account_number_masked') || detailsStr.includes('****'), 'AuditLog must contain masked account number');
  }
  console.log('✅ AuditLog verified: zero plaintext bank account exposure in audit records');

  // -------------------------------------------------------------------------
  // TEST 5: Concurrency & Active PAN Conflict Protection (HTTP 409)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Concurrency & Duplicate Active PAN Protection ---');

  // Create a third startup that attempts to claim the same active PAN as Startup 1
  const startupUser3 = await prisma.user.create({
    data: {
      name: 'Duplicate PAN Attempt',
      email: `dup_pan_${uniqueSuffix}@startup.in`,
      password_hash: adminPasswordHash,
      role: 'STARTUP',
      is_active: true,
      is_verified: true,
    }
  });
  const startup3 = await prisma.startup.create({
    data: {
      user_id: startupUser3.id,
      company_name: `Duplicate Entity ${uniqueSuffix}`,
      org_type: 'PRIVATE_LIMITED',
      verification_status: 'DRAFT',
      description: 'Duplicate entity description',
      domain: 'Healthcare & MedTech',
      location: 'Bengaluru, Karnataka',
    }
  });
  const startup3Token = generateToken({ id: startupUser3.id, role: startupUser3.role, email: startupUser3.email, startup_id: startup3.id });

  const dupPanRes = await fetch(`${BASE_URL}/startups/${startup3.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startup3Token}`,
    },
    body: JSON.stringify({ pan_number: pan1 }),
  });
  const dupPanData = await dupPanRes.json();
  const dupPanErrMsg = getErrMsg(dupPanData);
  assert.strictEqual(dupPanRes.status, 409, 'Duplicate active PAN must return HTTP 409 Conflict');
  console.log('✅ Duplicate active PAN rejected with HTTP 409 Conflict:', dupPanErrMsg);

  // -------------------------------------------------------------------------
  // TEST 6: Granular Document Resource-Level Authorization
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Resource-Level Document Access Control ---');

  const privateDoc = await prisma.startupDocument.findFirst({
    where: { startup_id: startup1.id }
  });

  // Evaluator not assigned to any challenge with Startup 1 tries to access private document
  const unauthorizedDocRes = await fetch(`${BASE_URL}/uploads/private/${privateDoc.id}`, {
    headers: { Authorization: `Bearer ${evalToken}` },
  });
  assert.strictEqual(unauthorizedDocRes.status, 403, 'Unassigned evaluator must receive 403 on private document');
  console.log('✅ Unassigned evaluator denied access to private startup document (HTTP 403)');

  // Startup owner accesses own document
  const ownerDocRes = await fetch(`${BASE_URL}/uploads/private/${privateDoc.id}`, {
    headers: { Authorization: `Bearer ${startup1Token}` },
  });
  // If file doesn't exist on disk, 404 is acceptable, but it MUST NOT be 403
  assert.notStrictEqual(ownerDocRes.status, 403, 'Startup owner must pass authorization check');
  console.log('✅ Startup owner passes document authorization check');

  // Admin accesses document
  const adminDocRes = await fetch(`${BASE_URL}/uploads/private/${privateDoc.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.notStrictEqual(adminDocRes.status, 403, 'Admin must pass document authorization check');
  console.log('✅ Admin passes document authorization check');

  console.log('\n===============================================================');
  console.log('🎉 ALL SETUGOV(10) REGISTRATION + INTEGRITY HARDENING TESTS PASSED!');
  console.log('===============================================================');
}

runRegistrationIntegrityHardeningTests()
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
