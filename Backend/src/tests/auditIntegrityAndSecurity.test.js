import assert from 'assert';
import http from 'http';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import * as auditService from '../services/auditService.js';
import { ForbiddenError } from '../utils/errors.js';

const generateToken = (payload) =>
  jwt.sign(
    { userId: payload.id || payload.userId, role: payload.role, email: payload.email, ...payload },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

async function runAuditIntegrityAndSecurityTests() {
  console.log('===============================================================');
  console.log('🛡️  RUNNING AUDIT LOGGING INTEGRITY & SECURITY HARDENING SUITE');
  console.log('===============================================================');

  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const suffix = Date.now();
  let adminUser, deptA, deptB, govUserA, govUserB, startupUser, startup, evaluatorUser;
  const createdAuditLogIds = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Fixtures (Admin, Departments, Gov Users, Startup, Evaluator)
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Creating Security Test Fixtures ---');
    const password_hash = await bcrypt.hash('Password123!', 10);

    adminUser = await prisma.user.create({
      data: {
        name: 'Audit Admin Test',
        email: `admin_audit_${suffix}@setugov.in`,
        password_hash,
        role: 'ADMIN',
        is_active: true,
        is_verified: true
      }
    });

    deptA = await prisma.department.create({
      data: {
        name: `Health Dept A ${suffix}`,
        state: 'Maharashtra',
        contact_email: `health_a_${suffix}@gov.in`,
        department_code: `HLTH_A_${suffix}`.slice(0, 20)
      }
    });

    deptB = await prisma.department.create({
      data: {
        name: `Urban Dept B ${suffix}`,
        state: 'Delhi',
        contact_email: `urban_b_${suffix}@gov.in`,
        department_code: `URBN_B_${suffix}`.slice(0, 20)
      }
    });

    govUserA = await prisma.user.create({
      data: {
        name: 'Gov Officer Dept A',
        email: `gov_a_${suffix}@health.gov.in`,
        password_hash,
        role: 'GOVERNMENT',
        department_id: deptA.id,
        is_active: true,
        is_verified: true
      }
    });

    govUserB = await prisma.user.create({
      data: {
        name: 'Gov Officer Dept B',
        email: `gov_b_${suffix}@urban.gov.in`,
        password_hash,
        role: 'GOVERNMENT',
        department_id: deptB.id,
        is_active: true,
        is_verified: true
      }
    });

    startupUser = await prisma.user.create({
      data: {
        name: 'Startup Founder Test',
        email: `startup_${suffix}@innovate.in`,
        password_hash,
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    startup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `InnovateAI ${suffix}`,
        description: 'AI for public healthcare',
        domain: 'HEALTHCARE',
        location: 'Mumbai, Maharashtra',
        verification_status: 'VERIFIED',
        pan_number: 'ABCDE1234F',
        authorized_person_name: 'Startup Founder Test',
        authorized_person_email: startupUser.email,
        authorized_person_phone: '9876543210'
      }
    });

    evaluatorUser = await prisma.user.create({
      data: {
        name: 'Evaluator Test',
        email: `eval_${suffix}@experts.org`,
        password_hash,
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true
      }
    });

    console.log('✅ Fixtures created successfully.');

    const adminToken = generateToken(adminUser);
    const govTokenA = generateToken(govUserA);
    const startupToken = generateToken(startupUser);
    const evalToken = generateToken(evaluatorUser);

    // -------------------------------------------------------------------------
    // TEST 1: Sensitive Data Redaction Before Database Write
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Sensitive Data Redaction Before DB Write ---');
    const secretLog = await auditService.createAuditLog({
      user_id: govUserA.id,
      action: 'SECURITY_TEST_SECRET_CHECK',
      entity_type: 'TEST_ENTITY',
      entity_id: 'test-entity-123',
      details: {
        raw_password: 'SuperSecretPassword123!',
        jwt_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        api_key: 'sk_live_1234567890abcdef',
        encryption_key: '0123456789abcdef0123456789abcdef',
        authorization: 'Bearer sensitive-token-here',
        account_number: '123456789012',
        non_sensitive_field: 'PubliclyVisibleValue'
      },
      ip_address: '127.0.0.1, 10.0.0.1'
    });
    createdAuditLogIds.push(secretLog.id);

    // Query RAW database record directly to verify what was actually written
    const rawDbRecord = await prisma.auditLog.findUnique({
      where: { id: secretLog.id }
    });

    assert(rawDbRecord, 'Audit record must exist in DB');
    assert.strictEqual(rawDbRecord.details.raw_password, '[REDACTED]', 'Password must be redacted in DB');
    assert.strictEqual(rawDbRecord.details.jwt_token, '[REDACTED]', 'JWT token must be redacted in DB');
    assert.strictEqual(rawDbRecord.details.api_key, '[REDACTED]', 'API key must be redacted in DB');
    assert.strictEqual(rawDbRecord.details.encryption_key, '[REDACTED]', 'Encryption key must be redacted in DB');
    assert.strictEqual(rawDbRecord.details.authorization, '[REDACTED]', 'Authorization header must be redacted in DB');
    assert.strictEqual(rawDbRecord.details.account_number, '****9012', 'Bank account must be masked in DB');
    assert.strictEqual(rawDbRecord.details.non_sensitive_field, 'PubliclyVisibleValue', 'Non-sensitive data preserved');
    assert.strictEqual(rawDbRecord.ip_address, '127.0.0.1', 'IP address must be sanitized to first client IP');
    console.log('✅ [PASS] Raw secrets and bank numbers are redacted and masked BEFORE database persistence.');

    // -------------------------------------------------------------------------
    // TEST 2: Immutability / Tamper Resistance via Public & Admin API
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Immutability & Tamper Resistance (No Write/Delete Endpoints) ---');
    // Attempt POST /api/v1/audit-logs
    const postRes = await fetch(`${baseUrl}/api/v1/audit-logs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'FORGED_ACTION', entity_type: 'FAKE' })
    });
    assert.strictEqual(postRes.status, 404, 'POST /audit-logs must return 404 (No creation endpoint)');

    // Attempt PUT /api/v1/audit-logs/:id
    const putRes = await fetch(`${baseUrl}/api/v1/audit-logs/${secretLog.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'TAMPERED_ACTION' })
    });
    assert.strictEqual(putRes.status, 404, 'PUT /audit-logs/:id must return 404 (No update endpoint)');

    // Attempt PATCH /api/v1/audit-logs/:id
    const patchRes = await fetch(`${baseUrl}/api/v1/audit-logs/${secretLog.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'TAMPERED_ACTION' })
    });
    assert.strictEqual(patchRes.status, 404, 'PATCH /audit-logs/:id must return 404 (No patch endpoint)');

    // Attempt DELETE /api/v1/audit-logs/:id
    const deleteRes = await fetch(`${baseUrl}/api/v1/audit-logs/${secretLog.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(deleteRes.status, 404, 'DELETE /audit-logs/:id must return 404 (No delete endpoint)');
    console.log('✅ [PASS] Audit logs are strictly immutable: no POST, PUT, PATCH, or DELETE endpoints exist.');

    // -------------------------------------------------------------------------
    // TEST 3: Strict Authorization & Data Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Strict Authorization & Cross-Department Isolation ---');
    // 3.1 Unauthenticated request rejected with 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/audit-logs`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated access to /audit-logs must be 401');

    // 3.2 STARTUP role rejected with 403
    const startupRes = await fetch(`${baseUrl}/api/v1/audit-logs`, {
      headers: { Authorization: `Bearer ${startupToken}` }
    });
    assert.strictEqual(startupRes.status, 403, 'STARTUP role must be forbidden from accessing audit logs');

    // 3.3 EVALUATOR role rejected with 403
    const evalRes = await fetch(`${baseUrl}/api/v1/audit-logs`, {
      headers: { Authorization: `Bearer ${evalToken}` }
    });
    assert.strictEqual(evalRes.status, 403, 'EVALUATOR role must be forbidden from accessing audit logs');

    // 3.4 Service-level direct authorization guard
    try {
      await auditService.getAuditLogs({}, startupUser);
      assert.fail('Should have thrown ForbiddenError for STARTUP user at service layer');
    } catch (err) {
      assert(err instanceof ForbiddenError, 'Must throw ForbiddenError');
    }

    try {
      await auditService.getAuditLogById(secretLog.id, startupUser);
      assert.fail('Should have thrown ForbiddenError for STARTUP user at service layer');
    } catch (err) {
      assert(err instanceof ForbiddenError, 'Must throw ForbiddenError');
    }

    // 3.5 Cross-department isolation: Gov User B cannot view Gov User A's department log
    try {
      await auditService.getAuditLogById(secretLog.id, govUserB);
      assert.fail('Should have thrown ForbiddenError for cross-department access');
    } catch (err) {
      assert(err instanceof ForbiddenError, 'Must throw ForbiddenError for cross-department access');
    }

    // 3.6 Admin can view audit logs
    const adminFetch = await auditService.getAuditLogs({ page: 1, limit: 10 }, adminUser);
    assert(adminFetch.logs.length > 0, 'Admin can view audit logs');
    console.log('✅ [PASS] Strict RBAC enforced: STARTUP and EVALUATOR blocked, cross-department access isolated.');

    // -------------------------------------------------------------------------
    // TEST 4: USER_LOGOUT Audit Event
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: USER_LOGOUT Audit Event ---');
    // Login to obtain fresh token
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: startupUser.email,
        password: 'Password123!'
      })
    });
    assert.strictEqual(loginRes.status, 200, 'Login must succeed');
    const loginData = await loginRes.json();
    const sessionToken = loginData.data.token;

    // Call logout endpoint
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`
      }
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout must succeed');

    // Verify audit log for USER_LOGOUT exists
    const logoutAudit = await prisma.auditLog.findFirst({
      where: {
        user_id: startupUser.id,
        action: 'USER_LOGOUT'
      },
      orderBy: { created_at: 'desc' }
    });
    assert(logoutAudit, 'USER_LOGOUT audit record must exist');
    assert.strictEqual(logoutAudit.details.email, startupUser.email);
    assert.strictEqual(logoutAudit.details.role, 'STARTUP');
    assert.strictEqual(logoutAudit.details.token, undefined, 'Token must NEVER be in details');
    createdAuditLogIds.push(logoutAudit.id);
    console.log('✅ [PASS] USER_LOGOUT action recorded with authenticated user context and no token leak.');

    // -------------------------------------------------------------------------
    // TEST 5: DOCUMENT_ACCESSED & DOCUMENT_ACCESS_DENIED Audit Events
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Document Access & Access Denied Audit Events ---');
    // Create a dummy startup document record
    const dummyDoc = await prisma.startupDocument.create({
      data: {
        startup_id: startup.id,
        document_type: 'PAN',
        document_url: 'dummy_pan_file_for_audit.pdf',
        file_name: 'dummy_pan_file_for_audit.pdf',
        verification_status: 'VERIFIED'
      }
    });

    // Create physical dummy file in uploads so it can be served
    const fs = await import('fs');
    const path = await import('path');
    const dummyFilePath = path.join(process.cwd(), 'uploads', 'dummy_pan_file_for_audit.pdf');
    fs.writeFileSync(dummyFilePath, 'DUMMY PDF CONTENT FOR AUDIT TEST');

    try {
      // 5.1 Authorized download by Admin -> 200 and DOCUMENT_ACCESSED
      const authDocRes = await fetch(`${baseUrl}/api/v1/uploads/${dummyDoc.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(authDocRes.status, 200, 'Admin download must succeed');

      const accessAudit = await prisma.auditLog.findFirst({
        where: {
          user_id: adminUser.id,
          action: 'DOCUMENT_ACCESSED',
          entity_id: dummyDoc.id
        },
        orderBy: { created_at: 'desc' }
      });
      assert(accessAudit, 'DOCUMENT_ACCESSED audit record must be created');
      createdAuditLogIds.push(accessAudit.id);

      // 5.2 Unauthorized download by Gov User B (not associated with startup) -> 403 and DOCUMENT_ACCESS_DENIED
      const unauthDocRes = await fetch(`${baseUrl}/api/v1/uploads/${dummyDoc.id}`, {
        headers: { Authorization: `Bearer ${generateToken(govUserB)}` }
      });
      assert.strictEqual(unauthDocRes.status, 403, 'Unrelated government officer must be 403');

      const deniedAudit = await prisma.auditLog.findFirst({
        where: {
          user_id: govUserB.id,
          action: 'DOCUMENT_ACCESS_DENIED',
          entity_id: dummyDoc.id
        },
        orderBy: { created_at: 'desc' }
      });
      assert(deniedAudit, 'DOCUMENT_ACCESS_DENIED audit record must be created');
      createdAuditLogIds.push(deniedAudit.id);
      console.log('✅ [PASS] DOCUMENT_ACCESSED and DOCUMENT_ACCESS_DENIED recorded accurately.');
    } finally {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
      await prisma.startupDocument.delete({ where: { id: dummyDoc.id } });
    }

    // -------------------------------------------------------------------------
    // TEST 6: Transactional Reliability & Atomic Rollback
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Transactional Reliability on Critical Transitions ---');
    // Test: A transaction failing midway does NOT commit orphaned audit logs
    const actionBeforeRollback = 'TEST_TRANSACTION_ROLLBACK_ACTION';
    try {
      await prisma.$transaction(async (tx) => {
        await auditService.createAuditLog({
          tx,
          user_id: govUserA.id,
          action: actionBeforeRollback,
          entity_type: 'TEST_TX',
          entity_id: 'tx-test-id'
        });

        // Deliberately trigger an error inside the transaction to cause rollback
        throw new Error('Forced simulation error to test atomic rollback');
      });
      assert.fail('Transaction should have failed');
    } catch (err) {
      assert(err.message.includes('Forced simulation error'), 'Expected forced error');
    }

    // Verify the audit log was rolled back and does not exist in DB
    const rolledBackLog = await prisma.auditLog.findFirst({
      where: { action: actionBeforeRollback }
    });
    assert.strictEqual(rolledBackLog, null, 'Rolled back audit log must NOT exist in the database');
    console.log('✅ [PASS] Transactional consistency verified: failed transactions roll back audit writes atomically.');

    console.log('\n===============================================================');
    console.log('🎉 ALL AUDIT LOGGING INTEGRITY & SECURITY TESTS PASSED! 🎉');
    console.log('===============================================================');
  } finally {
    // Cleanup fixtures
    console.log('\n--- CLEANUP: Removing Security Test Fixtures ---');
    if (createdAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } }
      });
    }

    if (startup) {
      await prisma.startup.deleteMany({ where: { id: startup.id } });
    }

    const userIdsToDelete = [
      adminUser?.id,
      govUserA?.id,
      govUserB?.id,
      startupUser?.id,
      evaluatorUser?.id
    ].filter(Boolean);

    if (userIdsToDelete.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { user_id: { in: userIdsToDelete } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIdsToDelete } }
      });
    }

    if (deptA) await prisma.department.deleteMany({ where: { id: deptA.id } });
    if (deptB) await prisma.department.deleteMany({ where: { id: deptB.id } });

    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    console.log('✅ Test cleanup completed successfully.');
  }
}

runAuditIntegrityAndSecurityTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
