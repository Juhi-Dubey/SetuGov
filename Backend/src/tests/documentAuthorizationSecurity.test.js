import assert from 'assert';
import http from 'http';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import storageService from '../services/storageService.js';
import { verifyDocumentAuthorization } from '../controllers/uploadController.js';

const generateToken = (payload) =>
  jwt.sign(
    { userId: payload.id, role: payload.role, email: payload.email, ...payload },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

async function runSecurityTests() {
  console.log('================================================================');
  console.log('🛡️  RUNNING DOCUMENT DOWNLOAD AUTHORIZATION SECURITY AUDIT SUITE');
  console.log('================================================================');

  const suffix = Date.now();
  const password_hash = await bcrypt.hash('Password123!', 10);
  const filesToCleanup = [];

  // Spin up test server on dynamic port
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let dept1, dept2;
  let adminUser, govUser1, govUser2, evalUserAssigned, evalUserUnassigned, startupUserA, startupUserB;
  let startupA, startupB;
  let challenge1;
  let application1;
  let assignment1;
  let testDocA;
  let adminToken, govToken1, govToken2, evalTokenAssigned, evalTokenUnassigned, startupTokenA, startupTokenB;

  try {
    // 1. Setup departments
    dept1 = await prisma.department.create({
      data: {
        name: `Health & Family Welfare ${suffix}`,
        state: 'Delhi',
        contact_email: `health_${suffix}@gov.in`,
        department_code: `HFW_${suffix}`
      }
    });

    dept2 = await prisma.department.create({
      data: {
        name: `Urban Transportation ${suffix}`,
        state: 'Karnataka',
        contact_email: `transport_${suffix}@gov.in`,
        department_code: `TRN_${suffix}`
      }
    });

    // 2. Setup users
    adminUser = await prisma.user.create({
      data: {
        email: `sec_admin_${suffix}@setugov.in`,
        password_hash,
        name: 'System Admin',
        role: 'ADMIN',
        is_active: true,
        is_verified: true
      }
    });
    adminToken = generateToken(adminUser);

    govUser1 = await prisma.user.create({
      data: {
        email: `sec_gov1_${suffix}@gov.in`,
        password_hash,
        name: 'Health Officer',
        role: 'GOVERNMENT',
        department_id: dept1.id,
        is_active: true,
        is_verified: true
      }
    });
    govToken1 = generateToken(govUser1);

    govUser2 = await prisma.user.create({
      data: {
        email: `sec_gov2_${suffix}@gov.in`,
        password_hash,
        name: 'Transport Officer',
        role: 'GOVERNMENT',
        department_id: dept2.id,
        is_active: true,
        is_verified: true
      }
    });
    govToken2 = generateToken(govUser2);

    evalUserAssigned = await prisma.user.create({
      data: {
        email: `sec_eval_assigned_${suffix}@eval.in`,
        password_hash,
        name: 'Assigned Evaluator',
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true
      }
    });
    evalTokenAssigned = generateToken(evalUserAssigned);

    evalUserUnassigned = await prisma.user.create({
      data: {
        email: `sec_eval_unassigned_${suffix}@eval.in`,
        password_hash,
        name: 'Unassigned Evaluator',
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true
      }
    });
    evalTokenUnassigned = generateToken(evalUserUnassigned);

    startupUserA = await prisma.user.create({
      data: {
        email: `sec_startupA_${suffix}@startup.in`,
        password_hash,
        name: 'Startup Owner A',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });
    startupTokenA = generateToken(startupUserA);

    startupUserB = await prisma.user.create({
      data: {
        email: `sec_startupB_${suffix}@startup.in`,
        password_hash,
        name: 'Startup Owner B',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });
    startupTokenB = generateToken(startupUserB);

    // 3. Setup Startups
    startupA = await prisma.startup.create({
      data: {
        user_id: startupUserA.id,
        company_name: `HealthTech Innovations ${suffix}`,
        description: 'AI Diagnostics',
        domain: 'HealthTech',
        technologies: ['AI', 'Python'],
        readiness_level: 2,
        location: 'New Delhi',
        verification_status: 'SUBMITTED',
        verification_source: 'SELF_DECLARED'
      }
    });

    startupB = await prisma.startup.create({
      data: {
        user_id: startupUserB.id,
        company_name: `Mobility Systems ${suffix}`,
        description: 'Fleet Optimization',
        domain: 'Transportation',
        technologies: ['Go', 'Docker'],
        readiness_level: 1,
        location: 'Bengaluru',
        verification_status: 'SUBMITTED',
        verification_source: 'SELF_DECLARED'
      }
    });

    // 4. Setup Challenge in Dept 1
    challenge1 = await prisma.challenge.create({
      data: {
        department_id: dept1.id,
        created_by: govUser1.id,
        title: `AI Health Screening Pilot ${suffix}`,
        problem_description: 'Need early diagnostic triage for rural clinics',
        current_baseline: 'Manual doctor inspection backlog',
        desired_outcome: 'Automated triage in under 3 minutes',
        location: 'New Delhi',
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 90,
        required_technologies: ['AI', 'Python'],
        status: 'PUBLISHED'
      }
    });

    // 5. Setup Application for Startup A under Challenge 1 (Dept 1)
    application1 = await prisma.application.create({
      data: {
        challenge_id: challenge1.id,
        startup_id: startupA.id,
        proposal: 'Deployment of specialized edge-AI diagnostic tablets',
        technical_approach: 'Edge compute devices with offline neural model inference',
        expected_impact: '3x reduction in patient waiting time',
        estimated_cost: 250000,
        timeline: '3 months rollout across 10 rural health centres',
        status: 'SUBMITTED'
      }
    });

    // 6. Assign evalUserAssigned to Application 1
    assignment1 = await prisma.evaluatorAssignment.create({
      data: {
        application_id: application1.id,
        evaluator_id: evalUserAssigned.id,
        assigned_by: adminUser.id,
        status: 'PENDING'
      }
    });

    // 7. Create physical sample PDF and attach to Startup A
    const sampleFileName = `verified_audit_doc_${suffix}.pdf`;
    const dummyPdfContent = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\nSECURE_DOCUMENT_PAYLOAD_TEST';
    await storageService.saveBuffer(sampleFileName, Buffer.from(dummyPdfContent), { mimeType: 'application/pdf' });
    filesToCleanup.push(sampleFileName);

    testDocA = await prisma.startupDocument.create({
      data: {
        startup_id: startupA.id,
        document_type: 'PAN_CARD',
        document_url: `/api/v1/documents/${sampleFileName}`,
        file_name: 'startupA_pan.pdf',
        mime_type: 'application/pdf',
        verification_status: 'PENDING'
      }
    });

    // =========================================================================
    // SECTION 1: verifyDocumentAuthorization() Function Logic Verification
    // =========================================================================
    console.log('\n--- SECTION 1: Unit Authorization Logic Tests ---');

    // 1.1: Anonymous / null user MUST return false
    const nullUserAuth = await verifyDocumentAuthorization(null, testDocA.id);
    assert.strictEqual(nullUserAuth, false, 'verifyDocumentAuthorization(null, docId) must return false');
    console.log('✅ 1.1 Unauthenticated access strictly returns false (Vulnerability 4 FIXED)');

    const undefinedUserAuth = await verifyDocumentAuthorization(undefined, sampleFileName);
    assert.strictEqual(undefinedUserAuth, false, 'verifyDocumentAuthorization(undefined, filename) must return false');
    console.log('✅ 1.2 Undefined user strictly returns false');

    // 1.3: Startup Owner A is authorized
    const ownerAuth = await verifyDocumentAuthorization(startupUserA, testDocA.id);
    assert.strictEqual(ownerAuth, true, 'Startup owner must be authorized to access own document');
    console.log('✅ 1.3 Startup owner has verified authorization (HTTP allowed)');

    // 1.4: Startup B is DENIED access to Startup A document (IDOR defense)
    const otherStartupAuth = await verifyDocumentAuthorization(startupUserB, testDocA.id);
    assert.strictEqual(otherStartupAuth, false, 'Startup B must be denied access to Startup A document');
    console.log('✅ 1.4 Startup B access to Startup A document strictly DENIED (anti-IDOR)');

    // 1.5: Government Officer in matching Department 1 is authorized (active application)
    const matchingGovAuth = await verifyDocumentAuthorization(govUser1, testDocA.id);
    assert.strictEqual(matchingGovAuth, true, 'Government officer in scope department must be authorized');
    console.log('✅ 1.5 Government officer with department scope authorized');

    // 1.6: Government Officer in unrelated Department 2 is DENIED
    const outsideGovAuth = await verifyDocumentAuthorization(govUser2, testDocA.id);
    assert.strictEqual(outsideGovAuth, false, 'Government officer outside scope department must be denied');
    console.log('✅ 1.6 Government officer outside department scope strictly DENIED');

    // 1.7: Assigned Evaluator is authorized
    const assignedEvalAuth = await verifyDocumentAuthorization(evalUserAssigned, testDocA.id);
    assert.strictEqual(assignedEvalAuth, true, 'Assigned evaluator must be authorized');
    console.log('✅ 1.7 Assigned evaluator authorized');

    // 1.8: Unassigned Evaluator is DENIED
    const unassignedEvalAuth = await verifyDocumentAuthorization(evalUserUnassigned, testDocA.id);
    assert.strictEqual(unassignedEvalAuth, false, 'Unassigned evaluator must be denied');
    console.log('✅ 1.8 Unassigned evaluator strictly DENIED');

    // 1.9: Recused Evaluator is DENIED
    await prisma.evaluatorAssignment.update({
      where: { id: assignment1.id },
      data: { status: 'RECUSED' }
    });
    const recusedEvalAuth = await verifyDocumentAuthorization(evalUserAssigned, testDocA.id);
    assert.strictEqual(recusedEvalAuth, false, 'Recused evaluator must lose document access');
    console.log('✅ 1.9 Recused evaluator immediately DENIED access');
    // Restore assignment
    await prisma.evaluatorAssignment.update({
      where: { id: assignment1.id },
      data: { status: 'PENDING' }
    });

    // 1.10: Admin has global access
    const adminAuth = await verifyDocumentAuthorization(adminUser, testDocA.id);
    assert.strictEqual(adminAuth, true, 'System administrator must be authorized');
    console.log('✅ 1.10 System Administrator globally authorized for verification & audit');

    // =========================================================================
    // SECTION 2: HTTP Endpoint Security Tests
    // =========================================================================
    console.log('\n--- SECTION 2: HTTP Route-Level Security Tests ---');

    const docUrls = [
      `${baseUrl}/api/v1/documents/${sampleFileName}`,
      `${baseUrl}/api/v1/documents/${testDocA.id}`,
      `${baseUrl}/uploads/${sampleFileName}`,
      `${baseUrl}/uploads/private/${testDocA.id}`
    ];

    for (const url of docUrls) {
      // 2.1: Anonymous access to private document endpoint -> 401 Unauthorized
      const anonRes = await fetch(url);
      assert.strictEqual(anonRes.status, 401, `Anonymous request to ${url} must return HTTP 401`);
    }
    console.log('✅ 2.1 Anonymous access to all document download endpoints strictly blocked (HTTP 401)');

    // 2.2: Startup B requesting Startup A document -> 403 Forbidden
    const startupBRes = await fetch(`${baseUrl}/api/v1/documents/${sampleFileName}`, {
      headers: { Authorization: `Bearer ${startupTokenB}` }
    });
    assert.strictEqual(startupBRes.status, 403, 'Startup B accessing Startup A document must return 403 Forbidden');
    console.log('✅ 2.2 Startup A -> Startup B document access blocked (HTTP 403 Forbidden)');

    // 2.3: Government officer outside department -> 403 Forbidden
    const govOutsideRes = await fetch(`${baseUrl}/api/v1/documents/${sampleFileName}`, {
      headers: { Authorization: `Bearer ${govToken2}` }
    });
    assert.strictEqual(govOutsideRes.status, 403, 'Unrelated government officer must return 403 Forbidden');
    console.log('✅ 2.3 Government officer outside department blocked (HTTP 403 Forbidden)');

    // 2.4: Evaluator without assignment -> 403 Forbidden
    const unassignedEvalRes = await fetch(`${baseUrl}/api/v1/documents/${sampleFileName}`, {
      headers: { Authorization: `Bearer ${evalTokenUnassigned}` }
    });
    assert.strictEqual(unassignedEvalRes.status, 403, 'Unassigned evaluator must return 403 Forbidden');
    console.log('✅ 2.4 Evaluator without assignment blocked (HTTP 403 Forbidden)');

    // 2.5: Authorized Startup Owner A -> 200 OK
    const ownerRes = await fetch(`${baseUrl}/api/v1/documents/${sampleFileName}`, {
      headers: { Authorization: `Bearer ${startupTokenA}` }
    });
    assert.strictEqual(ownerRes.status, 200, 'Authorized startup owner must receive 200 OK');
    const content = await ownerRes.text();
    assert.strictEqual(content, dummyPdfContent, 'Streamed content must match original payload');
    console.log('✅ 2.5 Authorized Startup Owner retrieved document successfully (HTTP 200 OK)');

    // 2.6: Authorized Admin -> 200 OK
    const adminRes = await fetch(`${baseUrl}/api/v1/documents/${sampleFileName}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminRes.status, 200, 'Admin access must receive 200 OK');
    console.log('✅ 2.6 System Administrator retrieved document successfully (HTTP 200 OK)');

    // 2.7: Path Traversal attempt -> 400 Bad Request
    const traversalRes = await fetch(`${baseUrl}/api/v1/documents/..%2F..%2Fpackage.json`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(traversalRes.status, 400, 'Path traversal attempt must return 400 Bad Request');
    console.log('✅ 2.7 Path traversal attempt (../../package.json) strictly blocked (HTTP 400 Bad Request)');

    // 2.8: Access with query token fallback (used by secure tab popup viewer) -> 200 OK
    const queryTokenRes = await fetch(`${baseUrl}/api/v1/documents/${sampleFileName}?token=${encodeURIComponent(startupTokenA)}`);
    assert.strictEqual(queryTokenRes.status, 200, 'Query token parameter fallback must succeed for authorized user');
    console.log('✅ 2.8 Secure query token fallback retrieved document successfully (HTTP 200 OK)');

    console.log('\n================================================================');
    console.log('🎉 ALL DOCUMENT AUTHORIZATION SECURITY TESTS PASSED! 🎉');
    console.log('================================================================');
  } finally {
    // Cleanup physical files
    for (const key of filesToCleanup) {
      await storageService.deleteFile(key).catch(() => null);
    }
    // Cleanup DB records
    try {
      if (assignment1) await prisma.evaluatorAssignment.delete({ where: { id: assignment1.id } }).catch(() => null);
      if (application1) await prisma.application.delete({ where: { id: application1.id } }).catch(() => null);
      if (challenge1) await prisma.challenge.delete({ where: { id: challenge1.id } }).catch(() => null);
      if (testDocA) await prisma.startupDocument.delete({ where: { id: testDocA.id } }).catch(() => null);
      if (startupA) await prisma.startup.delete({ where: { id: startupA.id } }).catch(() => null);
      if (startupB) await prisma.startup.delete({ where: { id: startupB.id } }).catch(() => null);
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => null);
      if (govUser1) await prisma.user.delete({ where: { id: govUser1.id } }).catch(() => null);
      if (govUser2) await prisma.user.delete({ where: { id: govUser2.id } }).catch(() => null);
      if (evalUserAssigned) await prisma.user.delete({ where: { id: evalUserAssigned.id } }).catch(() => null);
      if (evalUserUnassigned) await prisma.user.delete({ where: { id: evalUserUnassigned.id } }).catch(() => null);
      if (startupUserA) await prisma.user.delete({ where: { id: startupUserA.id } }).catch(() => null);
      if (startupUserB) await prisma.user.delete({ where: { id: startupUserB.id } }).catch(() => null);
      if (dept1) await prisma.department.delete({ where: { id: dept1.id } }).catch(() => null);
      if (dept2) await prisma.department.delete({ where: { id: dept2.id } }).catch(() => null);
    } catch {
      // Ignore cleanup error
    }
    server.close();
  }
}

runSecurityTests().catch((err) => {
  console.error('❌ Document authorization security test failure:', err);
  process.exit(1);
});
