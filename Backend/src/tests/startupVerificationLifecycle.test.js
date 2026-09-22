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

async function runStartupVerificationLifecycleTests() {
  console.log('===============================================================');
  console.log('🛡️ STARTUP VERIFICATION LIFECYCLE & STATE INTEGRITY SUITE');
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

  const createdUserIds = [];
  const createdStartupIds = [];

  try {
    const unique = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    // 1. Create Test Users
    // Verified Startup Founder
    const verifiedUser = await prisma.user.create({
      data: {
        name: `Verified Founder ${unique}`,
        email: `verified_${unique}@example.com`,
        password_hash: passwordHash,
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });
    createdUserIds.push(verifiedUser.id);
    const verifiedToken = generateToken(verifiedUser);

    // Other Startup Founder (Attacker / Unauthorized)
    const otherUser = await prisma.user.create({
      data: {
        name: `Other Founder ${unique}`,
        email: `other_${unique}@example.com`,
        password_hash: passwordHash,
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });
    createdUserIds.push(otherUser.id);
    const otherToken = generateToken(otherUser);

    // Admin User
    const adminUser = await prisma.user.create({
      data: {
        name: `System Admin ${unique}`,
        email: `admin_${unique}@example.com`,
        password_hash: passwordHash,
        role: 'ADMIN',
        is_verified: true,
        is_active: true
      }
    });
    createdUserIds.push(adminUser.id);
    const adminToken = generateToken(adminUser);

    // 2. Create a VERIFIED Startup Organization
    const verifiedStartup = await prisma.startup.create({
      data: {
        user_id: verifiedUser.id,
        company_name: `Verified Tech Solutions ${unique}`,
        org_type: 'PRIVATE_LIMITED',
        registered_address: '123 Tech Park, Electronic City',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        authorized_person_name: 'Dr. Anita Roy',
        authorized_person_designation: 'Director',
        authorized_person_email: `anita_${unique}@example.com`,
        authorized_person_phone: '9876543210',
        authorization_type: 'BOARD_RESOLUTION',
        pan_number: `AABCT${Math.floor(1000 + Math.random() * 9000)}F`,
        description: 'Hardened production verified startup providing AI services.',
        domain: 'Artificial Intelligence',
        technologies: ['Artificial Intelligence', 'Node.js'],
        location: 'Bengaluru',
        verification_status: 'VERIFIED',
        submitted_at: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        verified_at: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        verified_by: adminUser.id
      }
    });
    createdStartupIds.push(verifiedStartup.id);

    // Add Bank Details
    await prisma.startupBankDetails.create({
      data: {
        startup_id: verifiedStartup.id,
        account_holder_name: verifiedStartup.company_name,
        bank_name: 'State Bank of India',
        account_number: '123456789012',
        ifsc_code: 'SBIN0001234',
        account_type: 'CURRENT'
      }
    });

    // Add Required Documents in VERIFIED status
    const docTypes = ['PAN', 'INCORPORATION_CERTIFICATE', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
    for (const dt of docTypes) {
      await prisma.startupDocument.create({
        data: {
          startup_id: verifiedStartup.id,
          document_type: dt,
          document_url: `/api/v1/documents/verified_${dt.toLowerCase()}_${unique}.pdf`,
          file_name: `${dt.toLowerCase()}.pdf`,
          verification_status: 'VERIFIED',
          verified_by: adminUser.id,
          verified_at: new Date()
        }
      });
    }

    // -----------------------------------------------------------------------
    // TEST 1: VERIFIED startup cannot be downgraded to SUBMITTED by normal submission
    // -----------------------------------------------------------------------
    console.log('\n--- 1. VERIFIED Startup Submission Downgrade Guard ---');
    const downgradeRes = await request(
      'POST',
      `/api/v1/startups/${verifiedStartup.id}/submit`,
      { declaration_accepted: true },
      verifiedToken
    );

    assert.strictEqual(
      downgradeRes.statusCode,
      400,
      'Attempting normal submission on a VERIFIED startup must return HTTP 400 Bad Request'
    );
    assert.ok(
      downgradeRes.body.message.includes('VERIFIED'),
      'Error message must state that startup is already VERIFIED'
    );

    // Verify DB record status remained strictly VERIFIED
    const dbVerifiedStartup = await prisma.startup.findUnique({
      where: { id: verifiedStartup.id }
    });
    assert.strictEqual(
      dbVerifiedStartup.verification_status,
      'VERIFIED',
      'Startup verification_status in DB must remain VERIFIED'
    );
    assert.strictEqual(
      dbVerifiedStartup.verified_by,
      adminUser.id,
      'verified_by field must remain intact'
    );
    console.log('✅ VERIFIED startup successfully prevented from being downgraded to SUBMITTED (400 Bad Request)');

    // -----------------------------------------------------------------------
    // TEST 2: Admin calling normal submission endpoint cannot downgrade VERIFIED startup
    // -----------------------------------------------------------------------
    console.log('\n--- 2. Admin Normal Submission Guard for VERIFIED Startup ---');
    const adminSubmitRes = await request(
      'POST',
      `/api/v1/startups/${verifiedStartup.id}/submit`,
      { declaration_accepted: true },
      adminToken
    );

    assert.strictEqual(
      adminSubmitRes.statusCode,
      400,
      'Admin calling normal submission on a VERIFIED startup must also be blocked with HTTP 400'
    );

    const dbVerifiedStartup2 = await prisma.startup.findUnique({
      where: { id: verifiedStartup.id }
    });
    assert.strictEqual(
      dbVerifiedStartup2.verification_status,
      'VERIFIED',
      'Database status must remain VERIFIED after admin normal submission attempt'
    );
    console.log('✅ Admin normal submission safely blocked on VERIFIED startup');

    // -----------------------------------------------------------------------
    // TEST 3: Registration route alternate path (/registration/:id/submit) also guarded
    // -----------------------------------------------------------------------
    console.log('\n--- 3. Alternate Route (/registration/:id/submit) Downgrade Guard ---');
    const altRouteRes = await request(
      'POST',
      `/api/v1/startups/registration/${verifiedStartup.id}/submit`,
      { declaration_accepted: true },
      verifiedToken
    );

    assert.strictEqual(
      altRouteRes.statusCode,
      400,
      'Alternate route /registration/:id/submit must also block submission for VERIFIED startup'
    );
    console.log('✅ Alternate route /registration/:id/submit protected from downgrading VERIFIED startup');

    // -----------------------------------------------------------------------
    // TEST 4: Unauthorized user cannot submit for another startup
    // -----------------------------------------------------------------------
    console.log('\n--- 4. Authorization Enforcement on Registration Submission ---');
    const unauthorizedRes = await request(
      'POST',
      `/api/v1/startups/${verifiedStartup.id}/submit`,
      { declaration_accepted: true },
      otherToken
    );

    assert.strictEqual(
      unauthorizedRes.statusCode,
      403,
      'Unauthorized user must be denied with HTTP 403 Forbidden'
    );
    console.log('✅ Unauthorized user cannot submit registration for another startup (403 Forbidden)');

    // Unauthenticated request
    const unauthRes = await request(
      'POST',
      `/api/v1/startups/${verifiedStartup.id}/submit`,
      { declaration_accepted: true },
      null
    );
    assert.strictEqual(
      unauthRes.statusCode,
      401,
      'Unauthenticated request must be denied with HTTP 401'
    );
    console.log('✅ Unauthenticated request rejected with HTTP 401');

    // -----------------------------------------------------------------------
    // TEST 5: CORRECTION_REQUESTED startup can resubmit corrections
    // -----------------------------------------------------------------------
    console.log('\n--- 5. CORRECTION_REQUESTED Resubmission Workflow ---');
    const correctionStartup = await prisma.startup.create({
      data: {
        user_id: otherUser.id,
        company_name: `Correction Candidate ${unique}`,
        org_type: 'PROPRIETORSHIP',
        registered_address: '456 Business Lane',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        authorized_person_name: 'Rajesh Sharma',
        authorized_person_designation: 'Proprietor',
        authorized_person_email: `rajesh_${unique}@example.com`,
        authorized_person_phone: '9876543211',
        authorization_type: 'SOLE_PROPRIETOR',
        pan_number: `BCKPT${Math.floor(1000 + Math.random() * 9000)}M`,
        description: 'Proprietorship startup updating credentials after correction request.',
        domain: 'Healthcare',
        technologies: ['Artificial Intelligence'],
        location: 'Bengaluru',
        verification_status: 'CORRECTION_REQUESTED',
        correction_notes: 'Please re-upload PAN with clearer scan.'
      }
    });
    createdStartupIds.push(correctionStartup.id);

    // Bank Details
    await prisma.startupBankDetails.create({
      data: {
        startup_id: correctionStartup.id,
        account_holder_name: correctionStartup.company_name,
        bank_name: 'HDFC Bank',
        account_number: '987654321098',
        ifsc_code: 'HDFC0001234',
        account_type: 'CURRENT'
      }
    });

    // Required Docs for PROPRIETORSHIP: PAN, BANK_PROOF, AUTHORIZED_PERSON_PROOF
    const propDocTypes = ['PAN', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
    for (const dt of propDocTypes) {
      await prisma.startupDocument.create({
        data: {
          startup_id: correctionStartup.id,
          document_type: dt,
          document_url: `/api/v1/documents/corrected_${dt.toLowerCase()}_${unique}.pdf`,
          file_name: `${dt.toLowerCase()}.pdf`,
          verification_status: 'PENDING'
        }
      });
    }

    // Resubmit dossier
    const resubmitRes = await request(
      'POST',
      `/api/v1/startups/${correctionStartup.id}/submit`,
      { declaration_accepted: true },
      otherToken
    );

    assert.strictEqual(
      resubmitRes.statusCode,
      200,
      'CORRECTION_REQUESTED startup must be able to resubmit dossier (HTTP 200)'
    );
    assert.strictEqual(
      resubmitRes.body.data.startup.verification_status,
      'SUBMITTED',
      'Status must transition from CORRECTION_REQUESTED to SUBMITTED'
    );

    // Verify DB update
    const dbCorrectionStartup = await prisma.startup.findUnique({
      where: { id: correctionStartup.id }
    });
    assert.strictEqual(dbCorrectionStartup.verification_status, 'SUBMITTED');
    assert.strictEqual(dbCorrectionStartup.correction_notes, null, 'Correction notes must be cleared upon resubmission');
    assert.ok(dbCorrectionStartup.submitted_at, 'submitted_at must be updated');
    console.log('✅ CORRECTION_REQUESTED startup successfully resubmitted corrections -> SUBMITTED');

    // -----------------------------------------------------------------------
    // TEST 6: Valid Onboarding Workflow Works (DRAFT -> SUBMITTED)
    // -----------------------------------------------------------------------
    console.log('\n--- 6. Standard Onboarding Workflow (DRAFT -> SUBMITTED) ---');
    const draftUser = await prisma.user.create({
      data: {
        name: `Draft Founder ${unique}`,
        email: `draft_${unique}@example.com`,
        password_hash: passwordHash,
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });
    createdUserIds.push(draftUser.id);
    const draftToken = generateToken(draftUser);

    const draftStartup = await prisma.startup.create({
      data: {
        user_id: draftUser.id,
        company_name: `Fresh Venture ${unique}`,
        org_type: 'LLP',
        registered_address: '789 Startup Hub',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        authorized_person_name: 'Pooja Verma',
        authorized_person_designation: 'Designated Partner',
        authorized_person_email: `pooja_${unique}@example.com`,
        authorized_person_phone: '9876543212',
        authorization_type: 'PARTNERSHIP_DEED',
        pan_number: `AABPL${Math.floor(1000 + Math.random() * 9000)}K`,
        description: 'New LLP startup submitting initial dossier for administrative verification.',
        domain: 'FinTech',
        technologies: ['Blockchain'],
        location: 'Mumbai',
        verification_status: 'DRAFT'
      }
    });
    createdStartupIds.push(draftStartup.id);

    await prisma.startupBankDetails.create({
      data: {
        startup_id: draftStartup.id,
        account_holder_name: draftStartup.company_name,
        bank_name: 'ICICI Bank',
        account_number: '112233445566',
        ifsc_code: 'ICIC0001234',
        account_type: 'CURRENT'
      }
    });

    const llpDocTypes = ['PAN', 'INCORPORATION_CERTIFICATE', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
    for (const dt of llpDocTypes) {
      await prisma.startupDocument.create({
        data: {
          startup_id: draftStartup.id,
          document_type: dt,
          document_url: `/api/v1/documents/draft_${dt.toLowerCase()}_${unique}.pdf`,
          file_name: `${dt.toLowerCase()}.pdf`,
          verification_status: 'PENDING'
        }
      });
    }

    const draftSubmitRes = await request(
      'POST',
      `/api/v1/startups/${draftStartup.id}/submit`,
      { declaration_accepted: true },
      draftToken
    );

    assert.strictEqual(
      draftSubmitRes.statusCode,
      200,
      'Valid DRAFT startup must successfully submit for verification (HTTP 200)'
    );
    assert.strictEqual(
      draftSubmitRes.body.data.startup.verification_status,
      'SUBMITTED',
      'Verification status must transition to SUBMITTED'
    );
    console.log('✅ Standard DRAFT startup successfully submitted dossier -> SUBMITTED');

    // -----------------------------------------------------------------------
    // TEST 7: Profile, Bank & Document Modification Locks for VERIFIED Startup
    // -----------------------------------------------------------------------
    console.log('\n--- 7. Modification Locks Enforced on VERIFIED Startup ---');
    const profileEditRes = await request(
      'PATCH',
      `/api/v1/startups/${verifiedStartup.id}`,
      { company_name: 'Attempted Silent Name Change' },
      verifiedToken
    );
    assert.strictEqual(profileEditRes.statusCode, 400, 'Profile editing locked for VERIFIED startup (400)');

    const bankEditRes = await request(
      'POST',
      `/api/v1/startups/${verifiedStartup.id}/bank-details`,
      {
        account_holder_name: 'Altered Name',
        bank_name: 'State Bank of India',
        account_number: '998877665544',
        ifsc_code: 'SBIN0001234'
      },
      verifiedToken
    );
    assert.strictEqual(bankEditRes.statusCode, 400, 'Bank details editing locked for VERIFIED startup (400)');

    const docUploadRes = await request(
      'POST',
      `/api/v1/startups/${verifiedStartup.id}/documents`,
      {
        document_type: 'PAN',
        document_url: '/api/v1/documents/new_pan.pdf'
      },
      verifiedToken
    );
    assert.strictEqual(docUploadRes.statusCode, 400, 'Document uploading locked for VERIFIED startup (400)');
    console.log('✅ Profile, bank details, and document uploads locked for VERIFIED startup');

    console.log('\n===============================================================');
    console.log('🎉 ALL STARTUP VERIFICATION LIFECYCLE TESTS PASSED! 🎉');
    console.log('===============================================================');
  } finally {
    // Teardown
    server.close();

    for (const sid of createdStartupIds) {
      try {
        await prisma.startupDocument.deleteMany({ where: { startup_id: sid } });
        await prisma.startupBankDetails.deleteMany({ where: { startup_id: sid } });
        await prisma.auditLog.deleteMany({ where: { entity_id: sid } });
        await prisma.startup.deleteMany({ where: { id: sid } });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    for (const uid of createdUserIds) {
      try {
        await prisma.notification.deleteMany({ where: { user_id: uid } });
        await prisma.auditLog.deleteMany({ where: { user_id: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

runStartupVerificationLifecycleTests().catch((err) => {
  console.error('\n❌ LIFECYCLE TEST SUITE FAILED:', err);
  process.exit(1);
});
