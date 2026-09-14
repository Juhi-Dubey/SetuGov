import http from 'http';
import assert from 'assert';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';

const generateToken = (payload) =>
  jwt.sign(
    { userId: payload.id || payload.userId, role: payload.role, email: payload.email, ...payload },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

async function runHardeningTests() {
  console.log('===============================================================');
  console.log('🛡️ SETUGOV(10) STARTUP REGISTRATION + ONBOARDING HARDENING SUITE');
  console.log('===============================================================');

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const postData = body ? JSON.stringify(body) : null;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(resBody)
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: resBody
            });
          }
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  };

  try {
    const unique = Date.now();
    const strongPassword = 'Password123!@#Secure';
    const testEmail = `founder_${unique}@hardenedtech.in`;
    const adminEmail = `admin_${unique}@setugov.gov.in`;

    // 1. Create Admin User
    const adminHash = await bcrypt.hash(strongPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: adminEmail,
        password_hash: adminHash,
        role: 'ADMIN',
        is_active: true,
        is_verified: true
      }
    });
    const adminToken = generateToken({ id: adminUser.id, role: 'ADMIN', email: adminUser.email });

    // -----------------------------------------------------------------------
    // PART 1: ACCOUNT REGISTRATION & PASSWORD POLICY
    // -----------------------------------------------------------------------
    console.log('\n--- 1. Account Registration & Password Policy ---');

    // 1.1 Non-startup role registration blocked
    const privilegedReg = await request('POST', '/api/v1/auth/register', {
      name: 'Fake Gov',
      email: `fakegov_${unique}@gov.in`,
      password: strongPassword,
      role: 'GOVERNMENT'
    });
    assert([403, 422].includes(privilegedReg.statusCode) || privilegedReg.body.data?.user?.role === 'STARTUP', 'Public registration for non-STARTUP role must be rejected or forced to STARTUP');
    console.log(`✅ Privileged role public registration blocked / forced to STARTUP (${privilegedReg.statusCode})`);

    // 1.2 Weak password (< 12 chars) blocked
    const weakPassReg = await request('POST', '/api/v1/auth/register', {
      name: 'Test Founder',
      email: testEmail,
      password: 'Short1!'
    });
    assert.strictEqual(weakPassReg.statusCode, 422, 'Weak password under 12 characters must be rejected with 422');
    console.log('✅ Sub-12 character password rejected (422)');

    // 1.3 Valid STARTUP registration
    const validReg = await request('POST', '/api/v1/auth/register', {
      name: 'Vikas Sharma',
      email: testEmail,
      password: strongPassword
    });
    assert.strictEqual(validReg.statusCode, 201, 'Valid registration must return 201');
    assert.strictEqual(validReg.body.data.user.is_active, false, 'User must be initially inactive');
    assert.strictEqual(validReg.body.data.user.is_verified, false, 'User must be unverified before email confirmation');
    assert.strictEqual(validReg.body.data.dev_verification_token, undefined, 'Raw verification token must NEVER be returned in API response');
    assert.strictEqual(validReg.body.data.token, undefined, 'No token in response');
    console.log('✅ STARTUP user registered in inactive & unverified state with zero token leakage in API response');

    // Verify DB stores only the SHA-256 hash
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert(dbUser.email_verification_token_hash, 'Token hash must be stored in DB');
    assert.strictEqual(dbUser.email_verification_token_hash.length, 64, 'SHA-256 hash must be 64 characters');

    // -----------------------------------------------------------------------
    // PART 2: EMAIL VERIFICATION (ACCOUNT VS STARTUP VERIFICATION)
    // -----------------------------------------------------------------------
    console.log('\n--- 2. Cryptographic Email Verification ---');

    // 2.1 Login before email verification blocked
    const unverifiedLogin = await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: strongPassword
    });
    assert.strictEqual(unverifiedLogin.statusCode, 401, 'Login before email verification must be denied (401)');
    console.log('✅ Login before email verification denied');

    // 2.2 Invalid verification token rejected
    const invalidTokenRes = await request('POST', '/api/v1/auth/verify-email', {
      token: 'completely_bogus_token_12345'
    });
    assert.strictEqual(invalidTokenRes.statusCode, 400, 'Invalid token must return 400');
    console.log('✅ Invalid verification token rejected');

    // 2.3 Set a controlled token for verification endpoint testing
    const testRawToken = crypto.randomBytes(32).toString('hex');
    const testTokenHash = crypto.createHash('sha256').update(testRawToken).digest('hex');
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { email_verification_token_hash: testTokenHash }
    });

    const verifyRes = await request('POST', '/api/v1/auth/verify-email', {
      token: testRawToken
    });
    assert.strictEqual(verifyRes.statusCode, 200, 'Valid verification token must return 200');
    assert.strictEqual(verifyRes.body.data.user.is_active, true, 'User is_active must now be true');
    assert.strictEqual(verifyRes.body.data.user.is_verified, true, 'User is_verified must now be true (email verified)');

    // CRITICAL CHECK: Startup verification status must still be DRAFT (NEVER equate email verified = startup verified!)
    assert.strictEqual(verifyRes.body.data.startup.verification_status, 'DRAFT', 'Startup record must remain in DRAFT status after email verification');
    console.log('✅ Account email verified, startup remains strictly in DRAFT status');

    // 2.4 Token reuse blocked
    const reuseRes = await request('POST', '/api/v1/auth/verify-email', {
      token: testRawToken
    });
    assert.strictEqual(reuseRes.statusCode, 400, 'Reusing verification token must be rejected (single-use)');
    console.log('✅ Verification token single-use enforced');

    // 2.5 Successful Login
    const loginRes = await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: strongPassword
    });
    assert.strictEqual(loginRes.statusCode, 200);
    const startupToken = loginRes.body.data.token;
    const startupId = loginRes.body.data.user.startups[0].id;

    // -----------------------------------------------------------------------
    // PART 3: DRAFT DOSSIER, STEP SAVING & RESUME PROGRESS
    // -----------------------------------------------------------------------
    console.log('\n--- 3. Multi-Step Onboarding Dossier & Step Saving ---');

    // 3.1 Fetch initial dossier
    const dossierRes = await request('GET', '/api/v1/startups/my-registration', null, startupToken);
    assert.strictEqual(dossierRes.statusCode, 200);
    assert.strictEqual(dossierRes.body.data.startup.verification_status, 'DRAFT');
    console.log('✅ Initial registration dossier loaded as DRAFT');

    // 3.2 Save Organization details (Step 2)
    const updateOrgRes = await request('PATCH', `/api/v1/startups/${startupId}`, {
      company_name: `InnovateX Solutions Pvt Ltd ${unique}`,
      org_type: 'PRIVATE_LIMITED',
      registered_address: '100 Innovation Park, Electronic City',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560100',
      official_email: `contact_${unique}@innovatex.in`,
      official_website: 'https://innovatex.in'
    }, startupToken);
    assert.strictEqual(updateOrgRes.statusCode, 200);
    console.log('✅ Organization step saved');

    // 3.3 Save Authorized Person (Step 3)
    const updateAuthRes = await request('PATCH', `/api/v1/startups/${startupId}`, {
      authorized_person_name: 'Vikas Sharma',
      authorized_person_designation: 'Managing Director',
      authorized_person_email: `vikas_${unique}@innovatex.in`,
      authorized_person_phone: '9876543210',
      authorization_type: 'BOARD_RESOLUTION'
    }, startupToken);
    assert.strictEqual(updateAuthRes.statusCode, 200);
    console.log('✅ Authorized person step saved');

    // 3.4 Save Business Identity (Step 4)
    const pan = `ABCDE${String(unique).slice(-4)}F`;
    const cin = `U72900KA2023PTC${String(unique).slice(-6)}`;
    const gstin = `29ABCDE${String(unique).slice(-4)}F1Z5`;

    const updateBizRes = await request('PATCH', `/api/v1/startups/${startupId}`, {
      pan_number: pan,
      cin_number: cin,
      gstin: gstin,
      dpiit_number: `DIPP${String(unique).slice(-5)}`
    }, startupToken);
    assert.strictEqual(updateBizRes.statusCode, 200);
    console.log('✅ Business identity step saved');

    // 3.5 Save Tech Profile (Step 5)
    const updateTechRes = await request('PATCH', `/api/v1/startups/${startupId}`, {
      description: 'AI-driven queue optimization and triage dispatch for district hospitals.',
      domain: 'Healthcare & MedTech',
      technologies: ['Artificial Intelligence', 'Machine Learning', 'Cloud'],
      readiness_level: 6,
      years_experience: 3,
      previous_deployments: 2,
      location: 'Bengaluru, Karnataka'
    }, startupToken);
    assert.strictEqual(updateTechRes.statusCode, 200);
    console.log('✅ Tech profile step saved');

    // -----------------------------------------------------------------------
    // PART 4: BANK DETAILS SECURITY & DEDICATED ENDPOINT
    // -----------------------------------------------------------------------
    console.log('\n--- 4. Sensitive Bank Details Security & Dedicated Endpoint ---');

    // 4.1 Save Bank Details with validation
    const saveBankRes = await request('POST', `/api/v1/startups/${startupId}/bank-details`, {
      account_holder_name: `InnovateX Solutions Pvt Ltd`,
      bank_name: 'State Bank of India',
      account_number: '123456789012',
      ifsc_code: 'SBIN0001234',
      branch_name: 'Electronic City Branch',
      account_type: 'CURRENT'
    }, startupToken);
    assert.strictEqual(saveBankRes.statusCode, 200);
    assert.strictEqual(saveBankRes.body.data.bank_details.masked_account_number, '****9012');
    console.log('✅ Bank details saved and account number masked in response');

    // 4.2 Dedicated Bank Details Endpoint (Owner access)
    const getBankOwnerRes = await request('GET', `/api/v1/startups/${startupId}/bank-details`, null, startupToken);
    assert.strictEqual(getBankOwnerRes.statusCode, 200);
    assert.strictEqual(getBankOwnerRes.body.data.bank_details.masked_account_number, '****9012');
    console.log('✅ Owner successfully accessed dedicated bank details endpoint');

    // 4.3 Dedicated Bank Details Endpoint (Admin access)
    const getBankAdminRes = await request('GET', `/api/v1/startups/${startupId}/bank-details`, null, adminToken);
    assert.strictEqual(getBankAdminRes.statusCode, 200);
    console.log('✅ Admin successfully accessed dedicated bank details endpoint');

    // 4.4 Non-admin / other startup cannot access another startup's bank details
    const otherUserHash = await bcrypt.hash(strongPassword, 10);
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other Founder',
        email: `other_${unique}@test.in`,
        password_hash: otherUserHash,
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });
    const otherToken = generateToken({ id: otherUser.id, role: 'STARTUP', email: otherUser.email });

    const unauthorizedBankRes = await request('GET', `/api/v1/startups/${startupId}/bank-details`, null, otherToken);
    assert.strictEqual(unauthorizedBankRes.statusCode, 403, 'Unauthorized user must be denied access to bank details (403)');
    console.log('✅ Unauthorized startup access to bank details denied (403)');

    // 4.5 Generic GET /startups/:id does not expose bank details to third parties
    const genericStartupRes = await request('GET', `/api/v1/startups/${startupId}`, null, otherToken);
    assert.strictEqual(genericStartupRes.statusCode, 200);
    assert.strictEqual(genericStartupRes.body.data.startup.bank_details, undefined, 'Generic startup GET must not leak bank details to unauthorized users');
    console.log('✅ Generic startup GET does not leak bank details');

    // -----------------------------------------------------------------------
    // PART 5: REQUIRED DOCUMENTS & ENTITY-SPECIFIC VALIDATION
    // -----------------------------------------------------------------------
    console.log('\n--- 5. Entity-Specific Required Documents & Incomplete Submission Guard ---');

    // 5.1 Incomplete submission (no documents uploaded yet) must fail
    const prematureSubmitRes = await request('POST', `/api/v1/startups/${startupId}/submit`, {
      declaration_accepted: true
    }, startupToken);
    assert.strictEqual(prematureSubmitRes.statusCode, 400, 'Submitting without required documents must fail (400)');
    console.log('✅ Premature submission blocked due to missing required documents');

    // 5.2 Upload required documents for PRIVATE_LIMITED (PAN, INCORPORATION_CERTIFICATE, BANK_PROOF, AUTHORIZED_PERSON_PROOF)
    const docTypes = ['PAN', 'INCORPORATION_CERTIFICATE', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
    const docIds = [];

    for (const docType of docTypes) {
      const uploadRes = await request('POST', `/api/v1/startups/${startupId}/documents`, {
        document_type: docType,
        document_url: `/api/v1/documents/uploads/mock_${docType.toLowerCase()}_${unique}.pdf`,
        file_name: `${docType.toLowerCase()}_sample.pdf`
      }, startupToken);
      assert.strictEqual(uploadRes.statusCode, 201);
      assert.strictEqual(uploadRes.body.data.document.verification_status, 'PENDING');
      docIds.push(uploadRes.body.data.document.id);
    }
    console.log('✅ All 4 entity-specific documents uploaded in PENDING status');

    // 5.3 Complete submission with declaration
    const completeSubmitRes = await request('POST', `/api/v1/startups/${startupId}/submit`, {
      declaration_accepted: true
    }, startupToken);
    assert.strictEqual(completeSubmitRes.statusCode, 200);
    assert.strictEqual(completeSubmitRes.body.data.startup.verification_status, 'SUBMITTED');
    console.log('✅ Startup dossier successfully submitted (SUBMITTED status)');

    // -----------------------------------------------------------------------
    // PART 6: ADMIN VERIFICATION WORKFLOW & GUARDS
    // -----------------------------------------------------------------------
    console.log('\n--- 6. Admin Verification State Machine & Approval Guard ---');

    // 6.1 Non-admin cannot start review or verify
    const unauthorizedVerify = await request('PATCH', `/api/v1/admin/startups/${startupId}/verify`, {
      action: 'APPROVE'
    }, startupToken);
    assert.strictEqual(unauthorizedVerify.statusCode, 403, 'Non-admin cannot verify startup');
    console.log('✅ Non-admin forbidden from executing Admin verification action');

    // 6.2 Admin starts review -> UNDER_REVIEW
    const startReviewRes = await request('PATCH', `/api/v1/admin/startups/${startupId}/verify`, {
      action: 'START_REVIEW',
      notes: 'Beginning document cross-verification'
    }, adminToken);
    assert.strictEqual(startReviewRes.statusCode, 200);
    assert.strictEqual(startReviewRes.body.data.startup.verification_status, 'UNDER_REVIEW');
    console.log('✅ Admin transitioned startup to UNDER_REVIEW');

    // 6.3 While UNDER_REVIEW, startup editing is locked
    const lockedEditRes = await request('PATCH', `/api/v1/startups/${startupId}`, {
      company_name: 'Attempted Silent Change'
    }, startupToken);
    assert.strictEqual(lockedEditRes.statusCode, 400, 'Editing while under review must be blocked');
    console.log('✅ Profile editing locked while UNDER_REVIEW');

    // 6.4 Admin attempts to APPROVE startup while documents are still PENDING -> Must be BLOCKED
    const prematureApproveRes = await request('PATCH', `/api/v1/admin/startups/${startupId}/verify`, {
      action: 'APPROVE',
      notes: 'Premature approval attempt'
    }, adminToken);
    assert.strictEqual(prematureApproveRes.statusCode, 400, 'Approving startup while documents are PENDING must fail');
    console.log('✅ Startup approval blocked when documents are still unverified (Part 6 guard verified)');

    // 6.5 Admin verifies each document
    for (const docId of docIds) {
      const docVerifyRes = await request('PATCH', `/api/v1/admin/documents/${docId}/verify`, {
        verification_status: 'VERIFIED'
      }, adminToken);
      assert.strictEqual(docVerifyRes.statusCode, 200);
    }
    console.log('✅ Admin verified all 4 submitted documents');

    // 6.6 Admin now APPROVES startup -> Transitions to VERIFIED
    const approveRes = await request('PATCH', `/api/v1/admin/startups/${startupId}/verify`, {
      action: 'APPROVE',
      notes: 'All documents verified against authentic state records.'
    }, adminToken);
    assert.strictEqual(approveRes.statusCode, 200);
    assert.strictEqual(approveRes.body.data.startup.verification_status, 'VERIFIED');
    console.log('✅ Startup successfully transitioned to VERIFIED status');

    // 6.7 When VERIFIED, profile editing remains locked
    const verifiedLockedRes = await request('PATCH', `/api/v1/startups/${startupId}`, {
      company_name: 'Post-Verification Name Change'
    }, startupToken);
    assert.strictEqual(verifiedLockedRes.statusCode, 400, 'Profile editing locked when VERIFIED');
    console.log('✅ Profile editing locked when VERIFIED');

    // -----------------------------------------------------------------------
    // PART 7: ELIGIBILITY ENFORCEMENT
    // -----------------------------------------------------------------------
    console.log('\n--- 7. Challenge Application Eligibility Enforcement ---');

    // Create a department and challenge
    const dept = await prisma.department.create({
      data: {
        name: `Health Department ${unique}`,
        state: 'Karnataka',
        contact_email: `health_${unique}@karnataka.gov.in`,
        verification_status: 'VERIFIED'
      }
    });

    const challenge = await prisma.challenge.create({
      data: {
        department_id: dept.id,
        title: `AI Triage Optimization ${unique}`,
        problem_description: 'Hospital waiting times in OPD exceed baseline.',
        current_baseline: '90 minutes',
        desired_outcome: 'Reduce to 45 minutes',
        location: 'Bengaluru',
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 60,
        required_technologies: ['Artificial Intelligence', 'Machine Learning'],
        status: 'PUBLISHED',
        created_by: adminUser.id
      }
    });

    // 7.1 Unverified startup attempts to apply -> Must be blocked
    const unverifiedStartup = await prisma.startup.create({
      data: {
        user_id: otherUser.id,
        company_name: `Unverified Corp ${unique}`,
        description: 'Healthcare AI tech',
        domain: 'Healthcare & MedTech',
        technologies: ['Artificial Intelligence'],
        location: 'Bengaluru',
        verification_status: 'DRAFT'
      }
    });

    const unverifiedAppRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Automated triage and hospital queue dispatch system',
      technical_approach: 'Machine learning routing with real-time ward telemetry',
      expected_impact: '50% reduction in patient waiting time across the district hospital',
      estimated_cost: 250000,
      timeline: '60 days deployment'
    }, otherToken);
    assert.strictEqual(unverifiedAppRes.statusCode, 403, 'Unverified startup must be forbidden from submitting applications');
    console.log('✅ Unverified startup blocked from challenge application (403)');

    // 7.2 Verified startup applies -> Success
    const verifiedAppRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Automated triage and hospital queue dispatch system',
      technical_approach: 'Machine learning routing with real-time ward telemetry',
      expected_impact: '50% reduction in patient waiting time across the district hospital',
      estimated_cost: 250000,
      timeline: '60 days deployment'
    }, startupToken);
    assert.strictEqual(verifiedAppRes.statusCode, 201, 'Verified startup must be allowed to apply');
    console.log('✅ Verified startup successfully submitted challenge application');

    // -----------------------------------------------------------------------
    // PART 8: DUPLICATE PROTECTION & 409 CONFLICT
    // -----------------------------------------------------------------------
    console.log('\n--- 8. Duplicate Identifier Protection (409 Conflict) ---');

    const duplicatePanRes = await request('PATCH', `/api/v1/startups/${unverifiedStartup.id}`, {
      pan_number: pan
    }, otherToken);
    assert.strictEqual(duplicatePanRes.statusCode, 409, 'Duplicate active PAN must return 409 Conflict');
    console.log('✅ Duplicate active PAN registration rejected with 409 Conflict');

    // -----------------------------------------------------------------------
    // PART 9: PRIVATE DOCUMENT AUTHORIZATION & PATH TRAVERSAL
    // -----------------------------------------------------------------------
    console.log('\n--- 9. Private Document Authorization & Path Traversal ---');

    // 9.1 Path traversal attempt blocked
    const traversalRes = await request('GET', '/api/v1/documents/..%2F..%2F..%2Fpackage.json', null, startupToken);
    assert([400, 403, 404].includes(traversalRes.statusCode), 'Path traversal must be safely rejected');
    console.log('✅ Path traversal attempt safely blocked');

    // 9.2 Unauthorized user cannot access other startup\'s document
    const unauthorizedDocRes = await request('GET', `/api/v1/documents/${docIds[0]}`, null, otherToken);
    assert.strictEqual(unauthorizedDocRes.statusCode, 403, 'Unauthorized document access must return 403');
    console.log('✅ Unauthorized private document access denied (403)');

    console.log('\n===============================================================');
    console.log('🎉 ALL SETUGOV(10) HARDENING TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('===============================================================');

  } finally {
    server.close();
  }
}

runHardeningTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
