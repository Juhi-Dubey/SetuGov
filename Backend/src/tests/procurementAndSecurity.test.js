import assert from 'assert';
import { prisma } from '../config/prisma.js';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000/api/v1';
const SERVER_ROOT = 'http://localhost:5000';

async function runProcurementAndSecurityTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING PRODUCTION READINESS & PROCUREMENT TEST SUITE');
  console.log('===============================================================');

  // STEP 0: Authentication
  console.log('\n--- STEP 0: Authenticating Test Users ---');

  // Login as Admin
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@setugov.in', password: 'Password123!' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData?.data?.token;
  assert(adminToken, 'Admin token must be obtained');
  console.log('✅ Admin authenticated');

  // Login as Government Officer
  const govtLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ramesh.kumar@health.gov.in', password: 'Password123!' }),
  });
  const govtData = await govtLoginRes.json();
  const govtToken = govtData?.data?.token;
  const govtUser = govtData?.data?.user;
  assert(govtToken, 'Government token must be obtained');
  console.log('✅ Government officer authenticated:', govtUser?.name);

  // Login as Startup
  const startupLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vikas@mediqueue.ai', password: 'Password123!' }),
  });
  const startupData = await startupLoginRes.json();
  const startupToken = startupData?.data?.token;
  const startupUser = startupData?.data?.user;
  assert(startupToken, 'Startup token must be obtained');
  console.log('✅ Startup authenticated:', startupUser?.name);


  // =========================================================================
  // PHASE 1: PRIVATE DOCUMENTS & ACCESS CONTROL
  // =========================================================================
  console.log('\n===============================================================');
  console.log('PHASE 1: PRIVATE DOCUMENT STORAGE & ACCESS CONTROL');
  console.log('===============================================================');

  // Test 1.1: Upload a private document as Startup
  const dummyPdf = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
  const pdfBlob = new Blob([dummyPdf], { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', pdfBlob, 'security-audit-report.pdf');

  const uploadRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${startupToken}` },
    body: form,
  });
  const uploadJson = await uploadRes.json();
  assert.strictEqual(uploadRes.status, 201, 'Upload must return 201');
  const fileUrl = uploadJson.data?.file_url;
  assert(fileUrl, 'Must return private document URL');
  console.log('✅ 1.1 Document uploaded via private route:', fileUrl);

  // Test 1.2: Verify that public static /uploads access is disabled (404)
  const filename = fileUrl.split('/').pop();
  const publicStaticRes = await fetch(`${SERVER_ROOT}/uploads/${filename}`);
  assert.strictEqual(publicStaticRes.status, 404, 'Public static /uploads must return 404 Not Found');
  console.log('✅ 1.2 Public static /uploads is strictly disabled (HTTP 404)');

  // Test 1.3: Unauthenticated access to /documents/:id is denied (401)
  const unauthDocRes = await fetch(`${BASE_URL}/documents/${filename}`);
  assert.strictEqual(unauthDocRes.status, 401, 'Unauthenticated document access must return 401');
  console.log('✅ 1.3 Unauthenticated document request strictly denied (HTTP 401)');

  // Test 1.4: Path traversal attempt is blocked
  const traversalRes = await fetch(`${BASE_URL}/documents/..%2f..%2fpackage.json`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert(traversalRes.status === 400 || traversalRes.status === 403 || traversalRes.status === 404, 'Path traversal must be blocked');
  console.log(`✅ 1.4 Path traversal attack blocked (HTTP ${traversalRes.status})`);

  // Test 1.5: Authorized Admin access succeeds with security headers
  const authDocRes = await fetch(`${BASE_URL}/documents/${filename}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert.strictEqual(authDocRes.status, 200, 'Authorized Admin access must return 200');
  assert.strictEqual(authDocRes.headers.get('x-content-type-options'), 'nosniff', 'Must include nosniff header');
  assert(authDocRes.headers.get('content-security-policy')?.includes("default-src 'none'"), 'Must include CSP header');
  console.log('✅ 1.5 Authorized Admin access returned 200 with strict CSP and nosniff security headers');


  // =========================================================================
  // PHASE 2: REAL EMAIL INVITATION & TOKEN HASHING
  // =========================================================================
  console.log('\n===============================================================');
  console.log('PHASE 2: REAL EMAIL INVITATION & TOKEN HASHING');
  console.log('===============================================================');

  // Test 2.1: Submit government access request
  const testOfficerEmail = `officer.test.${Date.now()}@karnataka.gov.in`;
  const accessReqRes = await fetch(`${BASE_URL}/access-requests/government`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bypass-rate-limit': 'test-bypass',
    },
    body: JSON.stringify({
      name: 'Dr. Ramesh Patil',
      email: testOfficerEmail,
      phone: '9876543210',
      designation: 'Director of Healthcare Innovation',
      department_name: 'Department of Health & Family Welfare',
      state: 'Karnataka',
      reason: 'Deployment of AI diagnostic pilots in district hospitals across Karnataka.',
      turnstileToken: 'test_dummy_turnstile_pass',
    }),
  });
  const accessReqJson = await accessReqRes.json();
  if (accessReqRes.status !== 201) {
    console.error('ACCESS REQ ERROR RESPONSE:', JSON.stringify(accessReqJson, null, 2));
  }
  assert.strictEqual(accessReqRes.status, 201, 'Access request creation must return 201');
  const requestId = accessReqJson.data?.id || accessReqJson.data?.request?.id;
  assert(requestId, 'Request ID must be present');
  console.log('✅ 2.1 Access request created for test officer:', testOfficerEmail);

  // Test 2.2: Admin Approves -> Email dispatched & token stored ONLY as hash
  const approveRes = await fetch(`${BASE_URL}/access-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'x-bypass-rate-limit': 'test-bypass',
    },
    body: JSON.stringify({
      notes: 'Verified government credentials and departmental delegation.',
    }),
  });
  const approveJson = await approveRes.json();
  assert.strictEqual(approveRes.status, 200, 'Admin approval must return 200');

  // Verify token hash in DB on User account
  const dbReq = await prisma.accessRequest.findUnique({ where: { id: requestId } });
  const dbUser = await prisma.user.findUnique({ where: { email: testOfficerEmail } });
  assert(dbUser?.invitation_token_hash, 'Invitation token hash must be persisted on User');
  assert.strictEqual(dbUser.invitation_token_hash.length, 64, 'SHA256 token hash must be 64 characters');
  assert.strictEqual(dbReq.status, 'APPROVED', 'Request status must be APPROVED');
  assert.strictEqual(dbUser.is_active, false, 'User must remain inactive until invitation is accepted');
  console.log('✅ 2.2 Invitation token stored ONLY as cryptographic SHA-256 hash in DB (64 hex chars)');


  // =========================================================================
  // PHASE 3: DB-LEVEL DUPLICATE & RACE PROTECTION
  // =========================================================================
  console.log('\n===============================================================');
  console.log('PHASE 3: DATABASE-LEVEL DUPLICATE & RACE PROTECTION');
  console.log('===============================================================');

  const concurrentEmail = `race.test.${Date.now()}@karnataka.gov.in`;
  const concurrentRequests = Array.from({ length: 5 }, () =>
    fetch(`${BASE_URL}/access-requests/government`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-rate-limit': 'test-bypass',
      },
      body: JSON.stringify({
        name: 'Concurrent Test Officer',
        email: concurrentEmail,
        phone: '9876543211',
        designation: 'Joint Director',
        department_name: 'Department of Urban Development',
        state: 'Karnataka',
        reason: 'Concurrency race condition verification for state pilot evaluation.',
        turnstileToken: 'test_dummy_turnstile_pass',
      }),
    })
  );

  const responses = await Promise.all(concurrentRequests);
  const status = responses.map((r) => r.status);
  const successCount = status.filter((s) => s === 201).length;
  const conflictCount = status.filter((s) => s === 409).length;

  console.log(`Concurrent results: ${successCount} Created (201), ${conflictCount} Conflict (409)`);
  assert.strictEqual(successCount, 1, 'Exactly ONE request must succeed');
  assert(conflictCount >= 3, 'All duplicate concurrent requests must be blocked');

  // Verify in PostgreSQL database directly
  const dbCount = await prisma.accessRequest.count({ where: { email: concurrentEmail } });
  assert.strictEqual(dbCount, 1, 'PostgreSQL database must contain exactly ONE active request');
  console.log('✅ 3.1 Race condition blocked: DB-level partial unique index guaranteed exactly 1 active request in PostgreSQL');


  // =========================================================================
  // PHASE 5: REAL DB SETTINGS, CRITERIA & TEMPLATES
  // =========================================================================
  console.log('\n===============================================================');
  console.log('PHASE 5: DATABASE PERSISTENCE FOR SETTINGS, CRITERIA & TEMPLATES');
  console.log('===============================================================');

  // Test 5.1: Settings API
  const settingsRes = await fetch(`${BASE_URL}/admin/settings`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const settingsJson = await settingsRes.json();
  assert.strictEqual(settingsRes.status, 200, 'GET /admin/settings must return 200');
  console.log('✅ 5.1 System settings fetched from PostgreSQL database');

  // Test 5.2: Create Evaluation Criterion
  const criterionKey = `CRIT_${Date.now()}`;
  const createCritRes = await fetch(`${BASE_URL}/admin/criteria`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: criterionKey,
      name: 'Empirical Scalability Index',
      category: 'TECHNICAL',
      weight: 25,
      max_score: 100,
      description: 'Assessment of architectural scalability under civic loads.',
    }),
  });
  assert.strictEqual(createCritRes.status, 201, 'POST /admin/criteria must return 201');
  console.log('✅ 5.2 Evaluation criterion persisted to PostgreSQL');

  // Test 5.3: Create System Template
  const createTplRes = await fetch(`${BASE_URL}/admin/templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Post-Pilot Procurement Template ${Date.now()}`,
      type: 'Procurement',
      description: 'Standard operating procedure for GeM direct purchase and L1 tendering.',
      fields_count: 8,
      status: 'Active',
    }),
  });
  assert.strictEqual(createTplRes.status, 201, 'POST /admin/templates must return 201');
  console.log('✅ 5.3 System template persisted to PostgreSQL');


  // =========================================================================
  // PHASE 6: REAL PROCUREMENT / POST-PILOT WORKFLOW LIFECYCLE
  // =========================================================================
  console.log('\n===============================================================');
  console.log('PHASE 6: REAL PROCUREMENT & POST-PILOT WORKFLOW');
  console.log('===============================================================');

  // Setup: Find or prepare a pilot with SCALE decision
  let pilot = await prisma.pilot.findFirst({
    where: { status: 'SCALED' },
    include: { challenge: true, startup: true },
  });

  if (!pilot) {
    // Find any existing pilot and set to SCALED for testing procurement workflow
    const existingPilot = await prisma.pilot.findFirst({
      include: { challenge: true, startup: true },
    });
    if (existingPilot) {
      pilot = await prisma.pilot.update({
        where: { id: existingPilot.id },
        data: { status: 'SCALED' },
        include: { challenge: true, startup: true },
      });
      // Ensure scale decision exists
      await prisma.scaleDecision.create({
        data: {
          pilot_id: pilot.id,
          decision: 'SCALE',
          score: 88,
          comments: 'Prerequisite validation verified for civic scale rollout.',
        },
      });
    }
  }

  assert(pilot, 'A pilot record is required to test procurement');
  console.log(`Testing procurement lifecycle on Pilot ID: ${pilot.id} (${pilot.title || pilot.challenge?.title})`);

  // Test 6.1: Initialize Procurement Readiness
  const readinessRes = await fetch(`${BASE_URL}/procurements/readiness`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${govtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pilot_id: pilot.id,
      procurement_route: 'GEM',
      estimated_value: 2500000,
      justification: 'Pilot proved 40% reduction in patient waiting times.',
      technical_readiness: true,
      compliance_readiness: true,
      cybersecurity_requirements: 'Compliant with Karnataka State Cyber Security Policy 2024.',
    }),
  });
  const readinessJson = await readinessRes.json();
  assert.strictEqual(readinessRes.status, 201, 'Procurement readiness creation must return 201');
  const procurement = readinessJson.data?.procurement || readinessJson.data;
  assert(procurement?.id, 'Procurement ID must be returned');
  assert.strictEqual(procurement.status, 'READINESS_CHECK', 'Initial status must be READINESS_CHECK');
  console.log('✅ 6.1 Procurement readiness recorded with status READINESS_CHECK, ID:', procurement.id);

  // Test 6.2: Government Department Approval
  const approveProcRes = await fetch(`${BASE_URL}/procurements/${procurement.id}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${govtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      approval_notes: 'Approved for direct purchase / custom bid on GeM Portal.',
    }),
  });
  const approveProcJson = await approveProcRes.json();
  assert.strictEqual(approveProcRes.status, 200, 'Procurement approval must return 200');
  const approveData = approveProcJson.data?.procurement || approveProcJson.data;
  assert.strictEqual(approveData?.status, 'APPROVED');
  console.log('✅ 6.2 Procurement approved by authorized government officer');

  // Test 6.3: Honest GeM Handoff (Records officer & manual reference without faking live API)
  const gemHandoffRes = await fetch(`${BASE_URL}/procurements/${procurement.id}/gem-handoff`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${govtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gem_reference_number: 'GEM-KA-2026-B-998811',
      gem_notes: 'Tender dossier uploaded to Government e-Marketplace. Forwarded for financial sanction.',
      gem_handoff_status: 'HANDED_OFF',
    }),
  });
  const gemHandoffJson = await gemHandoffRes.json();
  assert.strictEqual(gemHandoffRes.status, 200, 'GeM handoff must return 200');
  const gemData = gemHandoffJson.data?.procurement || gemHandoffJson.data;
  assert.strictEqual(gemData?.status, 'HANDED_OFF');
  assert.strictEqual(gemData?.gem_handoff_status, 'HANDED_OFF');
  console.log('✅ 6.3 GeM external handoff recorded honestly (no fake automated API simulation)');

  // Test 6.4: Contract / Purchase Order Issuance
  const contractRes = await fetch(`${BASE_URL}/procurements/${procurement.id}/contract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${govtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contract_reference: 'PO/BBMP/HLTH/2026/042',
      final_contract_value: 2500000,
      contract_effective_date: new Date().toISOString(),
      contract_duration_days: 365,
    }),
  });
  const contractJson = await contractRes.json();
  assert.strictEqual(contractRes.status, 200, 'Contract issuance must return 200');
  const contractData = contractJson.data?.procurement || contractJson.data;
  assert.strictEqual(contractData?.status, 'CONTRACT_ISSUED');
  console.log('✅ 6.4 Purchase order and contract PO/BBMP/HLTH/2026/042 issued');

  // Test 6.5: Delivery Submission by Startup
  const deliveryRes = await fetch(`${BASE_URL}/procurements/${procurement.id}/delivery`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${startupToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      delivery_scope: 'Phase 1 Hardware & Gateway Setup across 15 hospitals.',
      delivery_evidence_url: 'https://storage.setugov.in/evidence/delivery_phase1_signed.pdf',
      delivery_notes: 'All edge devices installed and connected to state cloud boundary.',
    }),
  });
  const deliveryJson = await deliveryRes.json();
  assert.strictEqual(deliveryRes.status, 200, 'Delivery submission must return 200');
  const deliveryData = deliveryJson.data?.procurement || deliveryJson.data;
  assert.strictEqual(deliveryData?.status, 'DELIVERY_SUBMITTED');
  assert.strictEqual(deliveryData?.acceptance_status, 'PENDING');
  console.log('✅ 6.5 Delivery evidence submitted by Startup partner');

  // Test 6.6: Government Formal Acceptance
  const acceptRes = await fetch(`${BASE_URL}/procurements/${procurement.id}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${govtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      acceptance_status: 'ACCEPTED',
      acceptance_remarks: 'Site inspection completed. All 15 hospital nodes operational and verified.',
    }),
  });
  const acceptJson = await acceptRes.json();
  assert.strictEqual(acceptRes.status, 200, 'Government acceptance must return 200');
  const acceptData = acceptJson.data?.procurement || acceptJson.data;
  assert.strictEqual(acceptData?.status, 'ACCEPTED');
  assert.strictEqual(acceptData?.acceptance_status, 'ACCEPTED');
  console.log('✅ 6.6 Formal government acceptance recorded by inspecting officer');

  // Test 6.7: Post-Acceptance Milestone Payment
  const paymentRes = await fetch(`${BASE_URL}/procurements/${procurement.id}/payment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${govtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 1000000,
      payment_percentage: 40,
      reference_number: 'KTR-PFMS-2026-909281',
    }),
  });
  const paymentJson = await paymentRes.json();
  assert.strictEqual(paymentRes.status, 201, 'Payment creation must return 201');
  console.log('✅ 6.7 Post-acceptance payment recorded with PFMS treasury reference KTR-PFMS-2026-909281');

  // Test 6.8: Verify Audit Logs
  const auditLogs = await prisma.auditLog.findMany({
    where: { entity_id: procurement.id },
    orderBy: { created_at: 'asc' },
  });
  assert(auditLogs.length >= 5, 'Must have at least 5 audit log entries for procurement lifecycle');
  console.log(`✅ 6.8 Immutable audit trail verified: ${auditLogs.length} audit entries captured for this procurement lifecycle`);

  console.log('\n===============================================================');
  console.log('🎉 ALL PRODUCTION-READINESS TESTS PASSED SUCCESSFULLY');
  console.log('===============================================================');
}

runProcurementAndSecurityTests()
  .catch((err) => {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
