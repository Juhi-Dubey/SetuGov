import assert from 'assert';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import * as authService from '../services/authService.js';
import * as userService from '../services/userService.js';
import * as adminService from '../services/adminService.js';
import * as startupService from '../services/startupService.js';
import { verifyDocumentAuthorization } from '../controllers/uploadController.js';
import { encryptString, decryptString, isEncrypted, maskAccountNumber } from '../utils/encryption.js';

async function runAuthLockoutAndSecurityTests() {
  console.log('===============================================================');
  console.log('🔒 RUNNING AUTHENTICATION LOCKOUT & SECURITY HARDENING TEST SUITE');
  console.log('===============================================================');

  const suffix = Date.now();
  const testEmail = `lockout_target_${suffix}@securitytest.org`;
  const plainPassword = 'CorrectPassword123!';
  const wrongPassword = 'WrongPassword456!';

  let testUser, adminUser, govUser, otherStartupUser;
  let testStartup, otherStartup, testDoc;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Fixtures (Target User, Admin User, Government User, Other Startup)
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Creating Security Test Fixtures ---');
    const password_hash = await bcrypt.hash(plainPassword, 10);

    testUser = await prisma.user.create({
      data: {
        name: 'Target Test User',
        email: testEmail,
        password_hash,
        role: 'STARTUP',
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0,
        locked_until: null
      }
    });

    adminUser = await prisma.user.create({
      data: {
        name: 'Security Admin',
        email: `admin_${suffix}@securitytest.org`,
        password_hash,
        role: 'ADMIN',
        is_active: true,
        is_verified: true
      }
    });

    govUser = await prisma.user.create({
      data: {
        name: 'Gov Officer',
        email: `gov_${suffix}@securitytest.org`,
        password_hash,
        role: 'GOVERNMENT',
        is_active: true,
        is_verified: true
      }
    });

    otherStartupUser = await prisma.user.create({
      data: {
        name: 'Other Founder',
        email: `other_${suffix}@securitytest.org`,
        password_hash,
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    testStartup = await prisma.startup.create({
      data: {
        user_id: testUser.id,
        company_name: `Security Shield Corp ${suffix}`,
        description: 'Hardened security testing startup profile',
        domain: 'Cybersecurity',
        technologies: ['AES-256', 'Crypto'],
        location: 'New Delhi',
        verification_status: 'DRAFT',
        verification_source: 'SELF_DECLARED'
      }
    });

    otherStartup = await prisma.startup.create({
      data: {
        user_id: otherStartupUser.id,
        company_name: `Other Startup ${suffix}`,
        description: 'Independent startup profile',
        domain: 'Logistics',
        technologies: ['Tracking'],
        location: 'Mumbai',
        verification_status: 'DRAFT',
        verification_source: 'SELF_DECLARED'
      }
    });

    testDoc = await prisma.startupDocument.create({
      data: {
        startup_id: testStartup.id,
        document_type: 'PAN',
        document_url: `/uploads/${testStartup.id}-pan.pdf`,
        file_name: 'company_pan.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        verification_status: 'PENDING'
      }
    });

    console.log('✅ Fixtures created successfully.');

    // -------------------------------------------------------------------------
    // TEST 1: Wrong Password Attempts & Account Lockout on 3rd Failure
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Account Lockout after 3 Failed Attempts ---');

    // Attempt 1: Wrong password
    await assert.rejects(
      async () => {
        await authService.login({ email: testEmail, password: wrongPassword });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.message, 'Invalid email or password.');
        return true;
      },
      'Attempt 1 must reject with generic 401 error'
    );

    let checkUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.strictEqual(checkUser.failed_login_attempts, 1, 'Failed login attempts should equal 1 after first wrong password');
    assert.strictEqual(checkUser.locked_until, null, 'Account should not be locked after attempt 1');

    // Attempt 2: Wrong password
    await assert.rejects(
      async () => {
        await authService.login({ email: testEmail, password: wrongPassword });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.message, 'Invalid email or password.');
        return true;
      },
      'Attempt 2 must reject with generic 401 error'
    );

    checkUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.strictEqual(checkUser.failed_login_attempts, 2, 'Failed login attempts should equal 2 after second wrong password');
    assert.strictEqual(checkUser.locked_until, null, 'Account should not be locked after attempt 2');

    // Attempt 3: Wrong password -> Lockout triggered
    await assert.rejects(
      async () => {
        await authService.login({ email: testEmail, password: wrongPassword });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert(err.message.includes('Account temporarily locked'), 'Error message must inform user account is temporarily locked');
        return true;
      },
      'Attempt 3 must trigger temporary account lockout'
    );

    checkUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.strictEqual(checkUser.failed_login_attempts, 3, 'Failed login attempts should equal 3 after third failure');
    assert(checkUser.locked_until !== null, 'Account locked_until must be set');
    assert(new Date(checkUser.locked_until) > new Date(), 'locked_until must be in the future');

    // Verify audit logs
    const lockAudit = await prisma.auditLog.findFirst({
      where: { user_id: testUser.id, action: 'ACCOUNT_LOCKED' }
    });
    assert(lockAudit, 'ACCOUNT_LOCKED audit log must be recorded');
    console.log('✅ Account successfully locked out on 3rd failed password attempt with ACCOUNT_LOCKED audit event.');

    // -------------------------------------------------------------------------
    // TEST 2: Correct Password While Locked -> Denied
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Correct Password while Locked Denied ---');
    await assert.rejects(
      async () => {
        await authService.login({ email: testEmail, password: plainPassword });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        assert(err.message.includes('Account temporarily locked'), 'Login with correct password while locked must still be rejected');
        return true;
      },
      'Authentication with correct password must be rejected while account is locked'
    );
    console.log('✅ Correct password while locked is rejected with safe generic message.');

    // -------------------------------------------------------------------------
    // TEST 3: Lockout Expiration -> Login Permitted & Counter Reset
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Lockout Expiration & Counter Reset on Success ---');
    // Simulate expiration of lockout window
    await prisma.user.update({
      where: { id: testUser.id },
      data: { locked_until: new Date(Date.now() - 1000) }
    });

    const loginRes = await authService.login({ email: testEmail, password: plainPassword });
    assert(loginRes.token, 'JWT token must be generated upon successful login after lockout expires');
    assert.strictEqual(loginRes.user.email, testEmail);

    checkUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.strictEqual(checkUser.failed_login_attempts, 0, 'Failed attempts counter must be reset to 0 on successful login');
    assert.strictEqual(checkUser.locked_until, null, 'locked_until must be cleared on successful login');

    const successAudit = await prisma.auditLog.findFirst({
      where: { user_id: testUser.id, action: 'LOGIN_SUCCESS' }
    });
    assert(successAudit, 'LOGIN_SUCCESS audit log must be recorded');
    console.log('✅ Lockout expired: Login succeeded and counter reset to 0 with LOGIN_SUCCESS audit event.');

    // -------------------------------------------------------------------------
    // TEST 4: Admin Unlock Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Admin Account Unlock ---');
    // Lock account again
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        failed_login_attempts: 3,
        locked_until: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    // 1. Non-admin (Government or Startup) cannot unlock
    await assert.rejects(
      async () => {
        await adminService.unlockUserAccount(testUser.id, govUser);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      },
      'Government user must not be permitted to unlock accounts'
    );

    // 2. Admin successfully unlocks account
    const unlockRes = await adminService.unlockUserAccount(testUser.id, adminUser);
    assert.strictEqual(unlockRes.failed_login_attempts, 0);
    assert.strictEqual(unlockRes.locked_until, null);

    const unlockAudit = await prisma.auditLog.findFirst({
      where: { action: 'ADMIN_ACCOUNT_UNLOCKED', entity_id: testUser.id }
    });
    assert(unlockAudit, 'ADMIN_ACCOUNT_UNLOCKED audit log must be recorded');

    // Login immediately possible now
    const immediateLogin = await authService.login({ email: testEmail, password: plainPassword });
    assert(immediateLogin.token, 'Login must succeed immediately following admin unlock');
    console.log('✅ Admin unlock succeeded, audit log created, and non-admins forbidden from unlocking.');

    // -------------------------------------------------------------------------
    // TEST 5: Client Attempts to Modify Security Fields (Lockout, Role, Status)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Client Modification of Security Fields Rejected ---');

    // Attempt to modify failed_login_attempts
    await assert.rejects(
      async () => {
        await userService.updateUser(testUser.id, { failed_login_attempts: 0 }, testUser);
      },
      (err) => {
        assert(err.statusCode === 403 || err.statusCode === 400, 'Attempt to modify failed_login_attempts must be rejected');
        return true;
      }
    );

    // Attempt to modify locked_until
    await assert.rejects(
      async () => {
        await userService.updateUser(testUser.id, { locked_until: null }, testUser);
      },
      (err) => {
        assert(err.statusCode === 403 || err.statusCode === 400, 'Attempt to modify locked_until must be rejected');
        return true;
      }
    );

    // Attempt to modify role
    await assert.rejects(
      async () => {
        await userService.updateUser(testUser.id, { role: 'ADMIN' }, testUser);
      },
      (err) => {
        assert(err.statusCode === 403 || err.statusCode === 400, 'Attempt to modify role must be rejected');
        return true;
      }
    );

    // Attempt to modify is_active
    await assert.rejects(
      async () => {
        await userService.updateUser(testUser.id, { is_active: true }, testUser);
      },
      (err) => {
        assert(err.statusCode === 403 || err.statusCode === 400, 'Attempt to modify is_active via profile update must be rejected');
        return true;
      }
    );

    // Attempt to modify verification_status directly on startup
    await assert.rejects(
      async () => {
        await startupService.updateStartup(testStartup.id, { verification_status: 'VERIFIED' }, testUser);
      },
      (err) => {
        assert(err.statusCode === 403 || err.statusCode === 400, 'Attempt to modify verification_status must be rejected');
        return true;
      }
    );
    console.log('✅ Client attempts to modify lock fields, role, is_active, or verification status strictly rejected.');

    // -------------------------------------------------------------------------
    // TEST 6: Document Security & Resource-Level Authorization
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Document Security & Resource Authorization ---');

    // 1. Owner can access own document
    const ownerAllowed = await verifyDocumentAuthorization(testUser, testDoc.id);
    assert.strictEqual(ownerAllowed, true, 'Startup owner must have access to own document');

    // 2. Admin can access document for review
    const adminAllowed = await verifyDocumentAuthorization(adminUser, testDoc.id);
    assert.strictEqual(adminAllowed, true, 'Administrator must have access to document for verification');

    // 3. Unrelated startup user is REJECTED
    const otherStartupDenied = await verifyDocumentAuthorization(otherStartupUser, testDoc.id);
    assert.strictEqual(otherStartupDenied, false, 'Unrelated startup user must be denied access to private documents');

    // 4. Government officer with no active challenge/pilot relation is REJECTED
    const unrelatedGovDenied = await verifyDocumentAuthorization(govUser, testDoc.id);
    assert.strictEqual(unrelatedGovDenied, false, 'Government officer with no department connection must be denied access');
    console.log('✅ Resource-level document authorization strictly enforced.');

    // -------------------------------------------------------------------------
    // TEST 7: Bank Account Application-Level Encryption & Masking
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Bank Data AES-256-GCM Encryption & Masking ---');
    const rawAccountNumber = '12345678901234';

    // 1. Save bank details
    const savedBank = await startupService.saveBankDetails(
      testStartup.id,
      {
        account_holder_name: 'Security Shield Corp',
        bank_name: 'State Bank of India',
        account_number: rawAccountNumber,
        ifsc_code: 'SBIN0001234',
        account_type: 'CURRENT'
      },
      testUser
    );

    assert.strictEqual(savedBank.masked_account_number, '****1234');
    assert.strictEqual(savedBank.account_number, '****1234', 'Normal response must return masked account number');

    // 2. Verify stored in database as AES-256-GCM ciphertext
    const rawDbRecord = await prisma.startupBankDetails.findUnique({
      where: { startup_id: testStartup.id }
    });
    assert(isEncrypted(rawDbRecord.account_number), 'Account number in PostgreSQL must be encrypted with AES-256-GCM');
    assert(rawDbRecord.account_number.startsWith('enc:gcm:'), 'Ciphertext must follow enc:gcm:iv:tag:cipher format');
    assert.strictEqual(decryptString(rawDbRecord.account_number), rawAccountNumber, 'Decrypted value must match raw number');

    // 3. Unauthorized access to bank details rejected
    await assert.rejects(
      async () => {
        await startupService.getBankDetails(testStartup.id, otherStartupUser);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      },
      'Other users must be forbidden from viewing bank details'
    );

    // 4. Government user cannot view bank details via getBankDetails
    await assert.rejects(
      async () => {
        await startupService.getBankDetails(testStartup.id, govUser);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      },
      'Government user must not be permitted to view raw bank details'
    );
    console.log('✅ Bank account is AES-256-GCM encrypted in DB, masked in responses, and forbidden to unauthorized roles.');

    // -------------------------------------------------------------------------
    // TEST 8: Registration & Verification Source Defaults
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Startup Defaults and Verification Source ---');
    const startupRecord = await prisma.startup.findUnique({ where: { id: testStartup.id } });
    assert.strictEqual(startupRecord.verification_source, 'SELF_DECLARED', 'Initial verification_source must be SELF_DECLARED');
    assert.strictEqual(startupRecord.verification_status, 'DRAFT', 'Initial verification_status must be DRAFT');
    console.log('✅ Initial verification_source is SELF_DECLARED and verification_status is DRAFT.');

    console.log('\n===============================================================');
    console.log('🎉 ALL AUTHENTICATION LOCKOUT & SECURITY TESTS PASSED!');
    console.log('===============================================================');
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- CLEANUP: Removing Test Fixtures ---');
    try {
      if (testDoc) {
        await prisma.startupDocument.deleteMany({ where: { id: testDoc.id } });
      }
      if (testStartup) {
        await prisma.startupBankDetails.deleteMany({ where: { startup_id: testStartup.id } });
        await prisma.startup.deleteMany({ where: { id: testStartup.id } });
      }
      if (otherStartup) {
        await prisma.startup.deleteMany({ where: { id: otherStartup.id } });
      }
      const userIds = [testUser?.id, adminUser?.id, govUser?.id, otherStartupUser?.id].filter(Boolean);
      await prisma.auditLog.deleteMany({ where: { user_id: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      console.log('✅ Cleanup completed.');
    } catch (cleanupErr) {
      console.warn('⚠️ Cleanup warning:', cleanupErr.message);
    }
  }
}

runAuthLockoutAndSecurityTests().catch((err) => {
  console.error('❌ SECURITY TEST SUITE FAILED:', err);
  process.exit(1);
});
