import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import * as accessRequestService from '../services/accessRequestService.js';
import * as authService from '../services/authService.js';

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    failed++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passed++;
    console.log(`✅ PASS: ${message}`);
  }
};

async function runTests() {
  console.log('================================================================');
  console.log('SETUGOV GOVERNMENT OFFICER ONBOARDING & SECURITY TEST SUITE');
  console.log('================================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const adminEmail = 'admin@setugov.in';
  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  assert(adminUser && adminUser.role === 'ADMIN', 'Admin user exists for testing');

  // Test Gov Officer Data
  const govEmail = `nodal.officer.${testSuffix}@health.gov.in`;
  const govName = `Dr. S. K. Kulkarni ${testSuffix}`;
  const deptName = `Maharashtra Public Health Directorate ${testSuffix}`;

  let createdRequestId = null;
  let rawInvitationToken = null;

  try {
    // -------------------------------------------------------------
    // CASE 1: Public user submits Government request -> PENDING
    // -------------------------------------------------------------
    console.log('\n--- CASE 1: Public user submits Government request ---');
    const req1 = await accessRequestService.createGovernmentAccessRequest({
      name: govName,
      email: govEmail,
      phone: '+91 9876543210',
      department_name: deptName,
      state: 'Maharashtra',
      designation: 'Joint Director Health',
      reason: 'Procuring AI diagnostic solutions for district civil hospitals',
      official_website: 'https://health.maharashtra.gov.in'
    });
    createdRequestId = req1.id;
    assert(req1.status === 'PENDING', 'AccessRequest created with status PENDING');
    assert(req1.requested_role === 'GOVERNMENT', 'AccessRequest requested_role is GOVERNMENT');
    assert(req1.email === govEmail.toLowerCase(), 'AccessRequest email correctly stored');

    // -------------------------------------------------------------
    // CASE 2: Government request attempts requested_role=ADMIN -> rejected/enforced
    // -------------------------------------------------------------
    console.log('\n--- CASE 2: Government request attempts privilege escalation to ADMIN ---');
    const rogueReq = await accessRequestService.createGovernmentAccessRequest({
      name: 'Rogue Officer',
      email: `rogue.${testSuffix}@gov.in`,
      department_name: deptName,
      state: 'Maharashtra',
      designation: 'Officer',
      reason: 'Attempting admin request',
      requested_role: 'ADMIN' // Malicious input
    });
    assert(rogueReq.requested_role === 'GOVERNMENT', 'Backend strictly overrides or ignores rogue role, forcing GOVERNMENT');
    await prisma.accessRequest.delete({ where: { id: rogueReq.id } }).catch(() => {});

    // -------------------------------------------------------------
    // CASE 3: Admin views request -> complete info visible
    // -------------------------------------------------------------
    console.log('\n--- CASE 3: Admin views request details ---');
    const viewedReq = await accessRequestService.getAccessRequestById(createdRequestId, adminUser);
    assert(viewedReq.id === createdRequestId, 'Admin retrieved access request by ID');
    assert(viewedReq.name === govName, 'Applicant name matches');
    assert(viewedReq.organization === deptName, 'Department / organization matches');
    assert(viewedReq.designation === 'Joint Director Health', 'Designation matches');

    // -------------------------------------------------------------
    // CASE 4: Duplicate PENDING request for same normalized email -> second request blocked
    // -------------------------------------------------------------
    console.log('\n--- CASE 4: Duplicate PENDING request protection ---');
    let duplicatePendingBlocked = false;
    try {
      await accessRequestService.createGovernmentAccessRequest({
        name: govName,
        email: `  ${govEmail.toUpperCase()}  `, // Test normalization with uppercase & whitespace
        phone: '+91 9876543210',
        department_name: deptName,
        state: 'Maharashtra',
        designation: 'Joint Director Health',
        reason: 'Submitting duplicate request while first is still pending'
      });
    } catch (err) {
      duplicatePendingBlocked = true;
      assert((err.statusCode === 400 || err.statusCode === 409) && err.message.includes('pending review'), 'Duplicate PENDING request rejected by backend');
    }
    assert(duplicatePendingBlocked, 'Duplicate active request for same email was blocked');

    // -------------------------------------------------------------
    // CASE 5: Same email with historical REJECTED request -> new request permitted
    // -------------------------------------------------------------
    console.log('\n--- CASE 5: Historical REJECTED request permits new submission ---');
    const reapplyEmail = `reapply.${testSuffix}@gov.in`;
    const initialReq = await accessRequestService.createGovernmentAccessRequest({
      name: 'Reapplying Officer',
      email: reapplyEmail,
      department_name: deptName,
      state: 'Maharashtra',
      designation: 'Officer',
      reason: 'First attempt'
    });
    // Admin rejects first attempt
    await accessRequestService.rejectAccessRequest(initialReq.id, { rejection_reason: 'Missing state letterhead' }, adminUser);

    // Re-submission should succeed now that previous request is REJECTED
    const reapplyReq = await accessRequestService.createGovernmentAccessRequest({
      name: 'Reapplying Officer',
      email: reapplyEmail,
      department_name: deptName,
      state: 'Maharashtra',
      designation: 'Officer',
      reason: 'Second attempt with proper authorization attached'
    });
    assert(reapplyReq && reapplyReq.status === 'PENDING', 'Re-submission allowed after previous rejection');
    assert(reapplyReq.id !== initialReq.id, 'Historical rejection preserved and new record created');
    await prisma.accessRequest.delete({ where: { id: reapplyReq.id } }).catch(() => {});
    await prisma.accessRequest.delete({ where: { id: initialReq.id } }).catch(() => {});

    // -------------------------------------------------------------
    // CASE 6, 7, 8: Malicious fields injection (reviewed_by, status=APPROVED, rejection_reason)
    // -------------------------------------------------------------
    console.log('\n--- CASE 6, 7, 8: Malicious field injection ignored or blocked ---');
    const forgedReq = await accessRequestService.createGovernmentAccessRequest({
      name: 'Forged Request Officer',
      email: `forged.${testSuffix}@gov.in`,
      department_name: deptName,
      state: 'Maharashtra',
      designation: 'Officer',
      reason: 'Attempting parameter injection',
      status: 'APPROVED',
      reviewed_by: adminUser.id,
      reviewed_at: new Date(),
      rejection_reason: 'Fake reason'
    });
    assert(forgedReq.status === 'PENDING', 'Backend strictly overrides status to PENDING');
    assert(forgedReq.reviewed_by === null || forgedReq.reviewed_by === undefined, 'Backend ignores client-provided reviewed_by');
    assert(forgedReq.rejection_reason === null || forgedReq.rejection_reason === undefined, 'Backend ignores client-provided rejection_reason');
    await prisma.accessRequest.delete({ where: { id: forgedReq.id } }).catch(() => {});

    // -------------------------------------------------------------
    // CASE 9: Admin rejects request without rejection reason -> fails (Section 20 Case 11)
    // -------------------------------------------------------------
    console.log('\n--- CASE 9: Admin rejects request without rejection reason ---');
    let rejectionValidationFailed = false;
    try {
      await accessRequestService.rejectAccessRequest(createdRequestId, { rejection_reason: '' }, adminUser);
    } catch (err) {
      rejectionValidationFailed = true;
      assert(err.statusCode === 400 || err.message.includes('required'), 'Rejection without reason rejected by backend');
    }
    assert(rejectionValidationFailed, 'Rejection without reason threw error as expected');

    // -------------------------------------------------------------
    // CASE 10: Admin rejects with reason -> status REJECTED + audit log (Section 20 Case 10)
    // -------------------------------------------------------------
    console.log('\n--- CASE 10: Admin rejects with reason ---');
    const dummyReq = await accessRequestService.createGovernmentAccessRequest({
      name: `Dummy Rejection ${testSuffix}`,
      email: `dummy.reject.${testSuffix}@gov.in`,
      department_name: deptName,
      state: 'Maharashtra',
      designation: 'Staff',
      reason: 'Test rejection flow'
    });
    const rejectedReq = await accessRequestService.rejectAccessRequest(dummyReq.id, {
      rejection_reason: 'Incomplete departmental authorization documents'
    }, adminUser);
    assert(rejectedReq.status === 'REJECTED', 'Status updated to REJECTED');
    assert(rejectedReq.rejection_reason === 'Incomplete departmental authorization documents', 'Rejection reason recorded');

    const rejectAudit = await prisma.auditLog.findFirst({
      where: { entity_id: dummyReq.id, action: 'GOVERNMENT_ACCESS_REQUEST_REJECTED' }
    });
    assert(rejectAudit !== null, 'AuditLog GOVERNMENT_ACCESS_REQUEST_REJECTED recorded');

    // -------------------------------------------------------------
    // CASE 11: Admin approves request -> invitation generated -> account NOT active yet
    // -------------------------------------------------------------
    console.log('\n--- CASE 11: Admin approves request -> invitation generated, account NOT active yet ---');
    const approvalRes = await accessRequestService.approveAccessRequest(createdRequestId, {}, adminUser);
    assert(approvalRes.request.status === 'APPROVED', 'AccessRequest status is APPROVED');
    assert(approvalRes.invitation && approvalRes.invitation.setup_token, 'Invitation token generated');
    rawInvitationToken = approvalRes.invitation.setup_token;

    // Check provisioned user in database: must be is_active: false
    const provisionedUser = await prisma.user.findUnique({ where: { email: govEmail } });
    assert(provisionedUser !== null, 'User record created in database');
    assert(provisionedUser.role === 'GOVERNMENT', 'User role is GOVERNMENT');
    assert(provisionedUser.is_active === false, 'CRITICAL: Account is NOT active yet (is_active === false)');
    assert(provisionedUser.is_verified === false, 'CRITICAL: Account is NOT verified yet (is_verified === false)');
    assert(provisionedUser.invitation_accepted_at === null, 'Invitation is not accepted yet');

    // Check login is BLOCKED before password setup
    let loginBlocked = false;
    try {
      await authService.login({ email: govEmail, password: 'AnyPassword123!' });
    } catch (err) {
      loginBlocked = true;
      assert(err.statusCode === 401 || err.message.includes('invitation'), 'Login blocked prior to invitation completion');
    }
    assert(loginBlocked, 'Unactivated invited user cannot log in');

    // -------------------------------------------------------------
    // CASE 12: Double approval / concurrent approval attempt rejected
    // -------------------------------------------------------------
    console.log('\n--- CASE 12: Double approval prevention ---');
    let doubleApprovalBlocked = false;
    try {
      await accessRequestService.approveAccessRequest(createdRequestId, {}, adminUser);
    } catch (err) {
      doubleApprovalBlocked = true;
      assert(err.statusCode === 400 && err.message.includes('already been approved'), 'Subsequent approval attempt on approved request rejected');
    }
    assert(doubleApprovalBlocked, 'Double approval safely blocked');

    // -------------------------------------------------------------
    // CASE 13: Invalid invitation token -> rejected
    // -------------------------------------------------------------
    console.log('\n--- CASE 13: Invalid invitation token rejected ---');
    let invalidTokenFailed = false;
    try {
      await authService.validateInvitation('invalid_random_token_1234567890');
    } catch (err) {
      invalidTokenFailed = true;
      assert(err.statusCode === 400, 'Invalid token returns 400 Bad Request');
    }
    assert(invalidTokenFailed, 'Invalid token was rejected');

    // -------------------------------------------------------------
    // CASE 14: Expired invitation token -> rejected
    // -------------------------------------------------------------
    console.log('\n--- CASE 14: Expired invitation token rejected ---');
    await prisma.user.update({
      where: { id: provisionedUser.id },
      data: { invitation_expires_at: new Date(Date.now() - 3600000) }
    });

    let expiredTokenFailed = false;
    try {
      await authService.validateInvitation(rawInvitationToken);
    } catch (err) {
      expiredTokenFailed = true;
      assert(err.statusCode === 400 && err.message.includes('expired'), 'Expired token returns 400 with expired message');
    }
    assert(expiredTokenFailed, 'Expired token was rejected');

    // Reset expiry back to future for remaining tests
    await prisma.user.update({
      where: { id: provisionedUser.id },
      data: { invitation_expires_at: new Date(Date.now() + 72 * 3600000) }
    });

    // -------------------------------------------------------------
    // CASE 15: Valid invitation -> credential setup allowed
    // -------------------------------------------------------------
    console.log('\n--- CASE 15: Valid invitation validation ---');
    const validInfo = await authService.validateInvitation(rawInvitationToken);
    assert(validInfo.valid === true, 'Invitation token validates successfully');
    assert(validInfo.email === govEmail, 'Validated token email matches');
    assert(validInfo.role === 'GOVERNMENT', 'Validated token role is GOVERNMENT');

    // -------------------------------------------------------------
    // CASE 16: Credentials created & Token consumed & Account activated
    // -------------------------------------------------------------
    console.log('\n--- CASE 16: Credentials setup, role derived from DB, account activated ---');
    const setupPassword = 'GovSecurePass2026!';
    const acceptRes = await authService.acceptInvitation({
      token: rawInvitationToken,
      password: setupPassword
    });

    assert(acceptRes.success === true, 'Invitation accepted successfully');
    assert(acceptRes.user.role === 'GOVERNMENT', 'Role remains strictly GOVERNMENT');
    assert(acceptRes.user.is_active === true, 'User is now ACTIVE');
    assert(acceptRes.user.is_verified === true, 'User is now VERIFIED');

    // Check token is consumed in DB (reuse blocked)
    let reuseFailed = false;
    try {
      await authService.acceptInvitation({
        token: rawInvitationToken,
        password: 'AnotherPassword123!'
      });
    } catch (err) {
      reuseFailed = true;
      assert(err.statusCode === 400, 'Reused invitation token strictly rejected');
    }
    assert(reuseFailed, 'Token reuse was prevented');

    // -------------------------------------------------------------
    // CASE 17: Government user logs in -> access granted
    // -------------------------------------------------------------
    console.log('\n--- CASE 17: Government user logs in with new credentials ---');
    const loginRes = await authService.login({
      email: govEmail,
      password: setupPassword
    });
    assert(loginRes.token && loginRes.user, 'Login succeeded, JWT returned');
    assert(loginRes.user.role === 'GOVERNMENT', 'Logged in user role is GOVERNMENT');
    assert(loginRes.user.email === govEmail, 'Logged in user email matches');

    // -------------------------------------------------------------
    // CASE 18: RBAC Enforcement & Cross-role escalation blocks
    // -------------------------------------------------------------
    console.log('\n--- CASE 18: RBAC Enforcement ---');
    const startupUser = await prisma.user.findFirst({ where: { role: 'STARTUP' } });
    if (startupUser) {
      let startupBlocked = false;
      try {
        await accessRequestService.getAccessRequests({}, startupUser);
      } catch (err) {
        startupBlocked = true;
        assert(err.statusCode === 403, 'Startup forbidden from viewing admin requests');
      }
      assert(startupBlocked, 'Startup access to admin requests blocked');
    }

    const evalUser = await prisma.user.findFirst({ where: { role: 'EVALUATOR' } });
    if (evalUser) {
      let evalBlocked = false;
      try {
        await accessRequestService.approveAccessRequest(createdRequestId, {}, evalUser);
      } catch (err) {
        evalBlocked = true;
        assert(err.statusCode === 403, 'Evaluator forbidden from approving access requests');
      }
      assert(evalBlocked, 'Evaluator approval blocked');
    }

    const govOfficerUser = await prisma.user.findUnique({ where: { email: govEmail } });
    let govBlocked = false;
    try {
      await accessRequestService.approveAccessRequest(createdRequestId, {}, govOfficerUser);
    } catch (err) {
      govBlocked = true;
      assert(err.statusCode === 403, 'Government officer forbidden from approving requests');
    }
    assert(govBlocked, 'Government officer approval blocked');

    // Existing STARTUP user privilege escalation test
    const existingStartupEmail = `existing.startup.${testSuffix}@example.com`;
    await prisma.user.create({
      data: {
        name: 'Existing Startup Lead',
        email: existingStartupEmail,
        password_hash: await bcrypt.hash('Password123!', 12),
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    let submissionBlocked = false;
    try {
      await accessRequestService.createGovernmentAccessRequest({
        name: 'Existing Startup Lead',
        email: existingStartupEmail,
        department_name: deptName,
        state: 'Maharashtra',
        designation: 'Director',
        reason: 'Trying to upgrade startup account to government'
      });
    } catch (err) {
      submissionBlocked = true;
      assert(err.statusCode === 403 && err.message.includes('role'), 'Submission guard blocked request for existing account with different role');
    }
    assert(submissionBlocked, 'Public submission blocked for existing startup account');

    const directReq = await prisma.accessRequest.create({
      data: {
        name: 'Existing Startup Lead',
        email: existingStartupEmail,
        requested_role: 'GOVERNMENT',
        organization: deptName,
        status: 'PENDING'
      }
    });

    let approvalEscalationBlocked = false;
    try {
      await accessRequestService.approveAccessRequest(directReq.id, {}, adminUser);
    } catch (err) {
      approvalEscalationBlocked = true;
      assert(err.statusCode === 403 && err.message.includes('prohibited'), 'Approval-level guard strictly blocked cross-role privilege escalation');
    }
    assert(approvalEscalationBlocked, 'Approval-level privilege escalation from STARTUP to GOVERNMENT blocked');
    await prisma.accessRequest.delete({ where: { id: directReq.id } }).catch(() => {});

  } finally {
    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
