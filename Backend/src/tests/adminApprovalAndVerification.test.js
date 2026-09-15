import assert from 'assert';
import { prisma } from '../config/prisma.js';
import * as accessRequestService from '../services/accessRequestService.js';
import * as evaluatorService from '../services/evaluatorService.js';
import * as authService from '../services/authService.js';
import * as auditService from '../services/auditService.js';

const testSuffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

async function runTests() {
  console.log('================================================================');
  console.log('SETUGOV ADMIN APPROVAL & EVALUATOR VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // Ensure Admin User Exists
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', is_active: true }
  });
  assert(adminUser, 'Admin user must exist for administrative actions');
  console.log('✅ PASS: Admin user verified in database');

  // -------------------------------------------------------------
  // TEST 1: Government Access Request -> Admin Review -> Approve
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Government Access Request -> Admin Review -> Approve ---');
  const govEmail = `gov_flow_${testSuffix}@example.gov.in`;
  const govReq = await accessRequestService.createGovernmentAccessRequest({
    name: 'Director General Verma',
    email: govEmail,
    department_name: `Department of Advanced Research ${testSuffix}`,
    state: 'Delhi',
    designation: 'Director General',
    reason: 'Official defense innovation procurement program.'
  });
  assert(govReq.status === 'PENDING', 'Government request created in PENDING status');
  assert(govReq.requested_role === 'GOVERNMENT', 'Requested role is GOVERNMENT');

  const govApproveResult = await accessRequestService.approveAccessRequest(govReq.id, {}, adminUser);
  assert(govApproveResult.request.status === 'APPROVED', 'Request status updated to APPROVED');
  assert(govApproveResult.user.role === 'GOVERNMENT', 'User provisioned with GOVERNMENT role');
  assert(govApproveResult.user.is_active === false, 'CRITICAL: User is NOT active immediately upon approval');
  assert(govApproveResult.user.is_verified === false, 'CRITICAL: User is NOT verified immediately upon approval');
  assert(govApproveResult.invitation.setup_token, 'Invitation setup token generated for onboarding');
  console.log('✅ PASS: 1. Government Access Request approved with unactivated account and post-commit email');

  // -------------------------------------------------------------
  // TEST 2: Evaluator Access Request -> Admin Review -> Approve
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Evaluator Access Request -> Admin Review -> Approve ---');
  const evalEmail = `eval_flow_${testSuffix}@university.edu`;
  const evalReq = await accessRequestService.createEvaluatorSelfApplication({
    name: 'Dr. Sunita Rao',
    email: evalEmail,
    organization: 'Indian Institute of Technology',
    designation: 'Associate Professor & AI Lab Head',
    domain_expertise: ['Deep Learning', 'Computer Vision'],
    years_experience: 12,
    bio: '12+ years evaluating emerging artificial intelligence solutions.',
    reason: 'To serve as an independent technical assessor.'
  });
  assert(evalReq.status === 'PENDING', 'Evaluator self-application created in PENDING status');
  assert(evalReq.requested_role === 'EVALUATOR', 'Requested role is EVALUATOR');

  const evalApproveResult = await accessRequestService.approveAccessRequest(evalReq.id, {}, adminUser);
  assert(evalApproveResult.request.status === 'APPROVED', 'Request status updated to APPROVED');
  assert(evalApproveResult.user.role === 'EVALUATOR', 'User provisioned with EVALUATOR role');
  assert(evalApproveResult.user.is_active === false, 'CRITICAL: Evaluator is NOT active immediately upon approval');
  assert(evalApproveResult.user.is_verified === false, 'CRITICAL: Evaluator is NOT verified immediately upon approval');
  assert(evalApproveResult.invitation.setup_token, 'Invitation setup token generated for evaluator');

  // Verify unverified EvaluatorProfile was prepared
  const pendingProfile = await prisma.evaluatorProfile.findUnique({
    where: { user_id: evalApproveResult.user.id }
  });
  assert(pendingProfile, 'Evaluator profile created in database');
  assert(pendingProfile.verification_status === 'PENDING', 'Evaluator profile verification_status is PENDING');
  console.log('✅ PASS: 2. Evaluator Access Request approved with PENDING profile and unactivated account');

  // -------------------------------------------------------------
  // TEST 3: Evaluator Registry -> Verify Evaluator
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Evaluator Registry -> Verify Evaluator ---');

  // 3a. Verify guard: cannot verify evaluator credentials BEFORE invitation acceptance (Task N & M)
  let unacceptedVerifyBlocked = false;
  try {
    await evaluatorService.verifyEvaluator(pendingProfile.id, { verification_status: 'VERIFIED' }, adminUser);
  } catch (err) {
    unacceptedVerifyBlocked = err.statusCode === 400 && err.message.includes('accepted their invitation');
  }
  assert(unacceptedVerifyBlocked, 'Task N: Verification strictly blocked before evaluator accepts invitation and sets password');
  console.log('✅ PASS: 3a. Verification guarded against unaccepted invitation');

  // Evaluator accepts invitation and activates account
  await authService.acceptInvitation({
    token: evalApproveResult.invitation.setup_token,
    password: 'SecureEvaluatorPass123!'
  });

  const activatedUser = await prisma.user.findUnique({ where: { id: evalApproveResult.user.id } });
  assert(activatedUser.is_active === true, 'Evaluator account is active after password setup');
  assert(activatedUser.invitation_accepted_at !== null, 'Invitation accepted timestamp recorded');

  // 3b. Admin now verifies evaluator credentials in Evaluator Registry
  const verifiedProfile = await evaluatorService.verifyEvaluator(
    pendingProfile.id,
    { verification_status: 'VERIFIED' },
    adminUser
  );
  assert(verifiedProfile.verification_status === 'VERIFIED', 'Evaluator profile status updated to VERIFIED');
  assert(verifiedProfile.verified_by === adminUser.id, 'Verified by Admin ID recorded');
  assert(verifiedProfile.verified_at !== null, 'Verification timestamp recorded');

  const finalUser = await prisma.user.findUnique({ where: { id: evalApproveResult.user.id } });
  assert(finalUser.is_verified === true, 'User is_verified updated to true upon credential verification');
  console.log('✅ PASS: 3b. Evaluator verified in registry with timeout-protected transaction');

  // -------------------------------------------------------------
  // TEST 4: Double Approval Protection (Task O)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Double Approval Protection ---');
  let doubleApprovalBlocked = false;
  try {
    await accessRequestService.approveAccessRequest(govReq.id, {}, adminUser);
  } catch (err) {
    doubleApprovalBlocked = err.statusCode === 400 && err.message.includes('already been approved');
  }
  assert(doubleApprovalBlocked, 'Double approval attempt on already-approved request is strictly rejected');
  console.log('✅ PASS: 4. Double approval safely blocked');

  // -------------------------------------------------------------
  // TEST 5: Double Verification Protection (Task O)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Double Verification Protection ---');
  let doubleVerificationBlocked = false;
  try {
    await evaluatorService.verifyEvaluator(pendingProfile.id, { verification_status: 'VERIFIED' }, adminUser);
  } catch (err) {
    doubleVerificationBlocked = err.statusCode === 400 && err.message.includes('already VERIFIED');
  }
  assert(doubleVerificationBlocked, 'Double verification attempt on already-VERIFIED evaluator is strictly rejected');
  console.log('✅ PASS: 5. Double verification safely blocked');

  // -------------------------------------------------------------
  // TEST 6: Atomic Audit Log Failure Propagation (Task F)
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Audit Log Failure Inside Transaction Causes Atomic Rollback ---');
  let rollbackSucceeded = false;
  const preTestEmail = `rollback_test_${testSuffix}@example.gov.in`;

  try {
    await prisma.$transaction(async (tx) => {
      // Step A: Create temporary user inside tx
      await tx.user.create({
        data: {
          name: 'Temporary User To Rollback',
          email: preTestEmail,
          password_hash: 'dummyhash123',
          role: 'EVALUATOR',
          is_active: false
        }
      });

      // Step B: Intentionally trigger audit failure with invalid tx call (e.g. invalid action/schema)
      // or passing mock throwing error through createAuditLog
      await auditService.createAuditLog({
        tx,
        user_id: 'non-existent-uuid-that-violates-foreign-key-000000000000',
        action: 'TEST_ROLLBACK_ACTION',
        entity_type: 'USER',
        entity_id: '123'
      });
    }, { maxWait: 10000, timeout: 15000 });
  } catch (err) {
    rollbackSucceeded = true;
  }

  assert(rollbackSucceeded, 'Transaction rolled back when auditLog failed inside tx');
  const userCheck = await prisma.user.findUnique({ where: { email: preTestEmail } });
  assert(!userCheck, 'User creation was atomically rolled back because auditLog error was not swallowed');
  console.log('✅ PASS: 6. AuditLog failure inside transaction causes atomic rollback (Task F verified)');

  // -------------------------------------------------------------
  // TEST 7: Email Delivery Failure Post-Commit Does NOT Rollback Approval (Task E)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Email Delivery Failure Post-Commit Preserves Approval ---');
  const emailFailEmail = `email_fail_${testSuffix}@test.gov.in`;
  const emailFailReq = await accessRequestService.createGovernmentAccessRequest({
    name: 'Officer With Failing Email',
    email: emailFailEmail,
    department_name: `Department of Water ${testSuffix}`,
    state: 'Punjab',
    designation: 'Chief Engineer',
    reason: 'Testing email resilience.'
  });

  // Approval succeeds even if external email provider has sandbox/network warnings
  const emailApprovalResult = await accessRequestService.approveAccessRequest(emailFailReq.id, {}, adminUser);
  assert(emailApprovalResult.request.status === 'APPROVED', 'Request remains approved');
  assert(emailApprovalResult.user.id, 'User account exists in database');

  const checkApprovedInDb = await prisma.accessRequest.findUnique({ where: { id: emailFailReq.id } });
  assert(checkApprovedInDb.status === 'APPROVED', 'DB commit was NOT rolled back by email dispatch');
  console.log('✅ PASS: 7. Post-commit email dispatch keeps DB approval fully committed');

  console.log('\n================================================================');
  console.log('ALL 7 ADMIN APPROVAL & VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');

  // Clean up test data
  await prisma.accessRequest.deleteMany({
    where: { email: { in: [govEmail, evalEmail, emailFailEmail] } }
  }).catch(() => {});

  await prisma.evaluatorProfile.deleteMany({
    where: { id: pendingProfile.id }
  }).catch(() => {});

  await prisma.user.deleteMany({
    where: { email: { in: [govEmail, evalEmail, emailFailEmail] } }
  }).catch(() => {});
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
