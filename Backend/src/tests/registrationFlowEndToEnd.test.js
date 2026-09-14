import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import createApp from '../app.js';
import { prisma } from '../config/prisma.js';

let server;
let BASE_URL;

async function runRegistrationFlowCheck() {
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  BASE_URL = `http://localhost:${port}/api/v1`;

  console.log('===============================================================');
  console.log('🔍 CHECKING SETUGOV FULL REGISTRATION FLOW');
  console.log('===============================================================');

  const uniqueId = Date.now();
  const testEmail = `founder_${uniqueId}@innovatetech.in`;
  const testPassword = 'SecurePassword123!#';
  const testName = `Rohan Mehta ${uniqueId}`;
  const testPhone = '9876543210';

  // STEP 1: Public Registration (POST /api/v1/auth/register)
  console.log('\n--- 1. POST /api/v1/auth/register ---');
  const regPayload = {
    name: testName,
    email: testEmail,
    password: testPassword,
    phone: testPhone,
    role: 'ADMIN' // Malicious role injection attempt: must be overridden to STARTUP
  };

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload)
  });

  const regData = await regRes.json();
  console.log('Registration Response HTTP Status:', regRes.status);
  assert.strictEqual(regRes.status, 201, 'Registration must return HTTP 201');
  assert.strictEqual(regData.data.user.role, 'STARTUP', 'User role must be strictly forced to STARTUP');
  assert.strictEqual(regData.data.user.is_verified, false, 'User must not be verified on signup');
  assert.strictEqual(regData.data.user.is_active, false, 'User account must not be active on signup');
  assert.strictEqual(regData.data.token, undefined, 'No auth token should be returned on unverified signup');
  assert.strictEqual(regData.data.verification_token, undefined, 'No raw verification token leaked in response');
  console.log('✅ Registration successfully created unverified STARTUP user without token leakage');

  // STEP 2: Database Record Integrity Verification
  console.log('\n--- 2. Database Record Integrity Verification ---');
  const dbUser = await prisma.user.findUnique({
    where: { email: testEmail },
    include: { startups: true }
  });

  assert(dbUser, 'User must exist in DB');
  assert.strictEqual(dbUser.role, 'STARTUP', 'DB user role must be STARTUP');
  assert(dbUser.email_verification_token_hash, 'Verification token hash must exist in DB');
  assert.strictEqual(dbUser.email_verification_token_hash.length, 64, 'Token hash must be 64-char SHA256 hex');

  assert(dbUser.startups.length > 0, 'Initial draft startup record must be created');
  const startup = dbUser.startups[0];
  assert.strictEqual(startup.company_name, '', 'Initial company_name must be empty, not fabricated');
  assert.strictEqual(startup.description, '', 'Initial description must be empty, not fabricated');
  assert.strictEqual(startup.domain, '', 'Initial domain must be empty, not fabricated');
  assert.strictEqual(startup.location, '', 'Initial location must be empty, not fabricated');
  assert.strictEqual(startup.verification_status, 'DRAFT', 'Initial verification_status must be DRAFT');
  assert.strictEqual(startup.verification_source, 'SELF_DECLARED', 'Initial verification_source must be SELF_DECLARED');
  console.log('✅ Initial startup profile contains zero fabricated defaults (clean empty fields)');

  // STEP 3: Login Attempt Prior to Verification
  console.log('\n--- 3. Login Attempt Before Email Verification ---');
  const prematureLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  console.log('Premature Login HTTP Status:', prematureLoginRes.status);
  assert.strictEqual(prematureLoginRes.status, 401, 'Login before email verification must fail with 401');
  console.log('✅ Premature login rejected prior to email verification');

  // STEP 4: Email Verification Flow (POST /api/v1/auth/verify-email)
  console.log('\n--- 4. Cryptographic Email Verification ---');
  const rawTestToken = crypto.randomBytes(32).toString('hex');
  const testHash = crypto.createHash('sha256').update(rawTestToken).digest('hex');
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      email_verification_token_hash: testHash,
      email_verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawTestToken, email: testEmail })
  });

  const verifyData = await verifyRes.json();
  console.log('Verify Email HTTP Status:', verifyRes.status);
  assert.strictEqual(verifyRes.status, 200, 'Email verification must return HTTP 200');
  assert(verifyData.data.token, 'Must return session token after verification');

  const verifiedUser = await prisma.user.findUnique({ where: { id: dbUser.id } });
  assert.strictEqual(verifiedUser.is_verified, true, 'User is_verified must be true');
  assert.strictEqual(verifiedUser.is_active, true, 'User is_active must be true');
  assert.strictEqual(verifiedUser.email_verification_token_hash, null, 'Token hash must be cleared (single-use)');
  console.log('✅ Email verified: account activated, token consumed');

  // STEP 5: Authorized Login Post-Verification
  console.log('\n--- 5. Authorized Login Post-Verification ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Login must succeed post-verification');
  const userToken = loginData.data.token;
  assert(userToken, 'Valid JWT token returned');
  console.log('✅ Login succeeded with active JWT token');

  // STEP 6: Fetch Dossier (GET /api/v1/startups/my-registration)
  console.log('\n--- 6. GET /api/v1/startups/my-registration ---');
  const dossierRes = await fetch(`${BASE_URL}/startups/my-registration`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const dossierData = await dossierRes.json();
  assert.strictEqual(dossierRes.status, 200);
  const myStartup = dossierData.data.startup;
  assert.strictEqual(myStartup.verification_status, 'DRAFT');
  assert.strictEqual(myStartup.company_name, '');
  console.log('✅ Registration dossier retrieved in DRAFT state');

  // STEP 7: Multi-Step Onboarding Updates
  console.log('\n--- 7. Onboarding Steps: Org, Signatory, Identity, Tech ---');
  const panNumber = `ABCDE${String(uniqueId).slice(-4)}F`;
  const cinNumber = `U72900KA2024PTC${String(uniqueId).slice(-6)}`;

  // Steps 2 - 5 Updates
  const updateRes = await fetch(`${BASE_URL}/startups/${myStartup.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      company_name: 'InnovateTech Systems Pvt Ltd',
      org_type: 'PRIVATE_LIMITED',
      registered_address: '123 Innovation Tech Park, Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      official_email: testEmail,
      authorized_person_name: testName,
      authorized_person_designation: 'Managing Director',
      authorized_person_email: testEmail,
      authorized_person_phone: testPhone,
      pan_number: panNumber,
      cin_number: cinNumber,
      description: 'AI-driven civic governance automation platform.',
      domain: 'Urban Governance & Smart Cities',
      technologies: ['Computer Vision', 'IoT', 'NLP'],
      readiness_level: 6,
      years_experience: 3,
      previous_deployments: 2
    })
  });
  const updateData = await updateRes.json();
  assert.strictEqual(updateRes.status, 200, 'Profile update must succeed');
  assert.strictEqual(updateData.data.startup.company_name, 'InnovateTech Systems Pvt Ltd');
  console.log('✅ Steps 2 - 5 profile data successfully persisted');

  // STEP 8: Bank Details (POST /api/v1/startups/:id/bank-details)
  console.log('\n--- 8. Step 6: Bank Details Persistence & Masking ---');
  const bankRes = await fetch(`${BASE_URL}/startups/${myStartup.id}/bank-details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      account_holder_name: 'InnovateTech Systems Pvt Ltd',
      bank_name: 'HDFC Bank',
      account_number: '50100234567890',
      ifsc_code: 'HDFC0001234',
      branch_name: 'Koramangala 5th Block',
      account_type: 'CURRENT'
    })
  });
  const bankData = await bankRes.json();
  assert.strictEqual(bankRes.status, 200, 'Bank details save must return 200');
  assert.strictEqual(bankData.data.bank_details.masked_account_number, '****7890', 'Bank account number must be masked in response');
  assert.strictEqual(bankData.data.bank_details.account_number, '****7890', 'Owner receives masked account number');
  console.log('✅ Bank details securely saved with account number masking');

  // STEP 9: Incomplete Submission Guard (Missing Documents)
  console.log('\n--- 9. Step 8: Submission Guard Before Documents Uploaded ---');
  const prematureSubmitRes = await fetch(`${BASE_URL}/startups/${myStartup.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ declaration_accepted: true })
  });
  console.log('Premature Submit HTTP Status:', prematureSubmitRes.status);
  assert.strictEqual(prematureSubmitRes.status, 400, 'Submission without required documents must fail with 400');
  console.log('✅ Premature submission blocked due to missing statutory documents');

  // STEP 10: Upload Mandatory Documents (POST /api/v1/startups/:id/documents)
  console.log('\n--- 10. Step 7: Statutory Documents Upload ---');
  const requiredDocTypes = ['PAN', 'INCORPORATION_CERTIFICATE', 'BANK_PROOF', 'AUTHORIZED_PERSON_PROOF'];
  for (const docType of requiredDocTypes) {
    const uploadRes = await fetch(`${BASE_URL}/startups/${myStartup.id}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        document_type: docType,
        document_url: `/api/v1/documents/doc_${docType.toLowerCase()}_${uniqueId}.pdf`,
        file_name: `${docType.toLowerCase()}.pdf`
      })
    });
    assert.strictEqual(uploadRes.status, 201, `Document upload for ${docType} must return 201`);
  }
  console.log('✅ All 4 mandatory statutory documents uploaded in PENDING status');

  // STEP 11: Dossier Submission (POST /api/v1/startups/:id/submit)
  console.log('\n--- 11. Step 8: Complete Dossier Submission ---');
  const submitRes = await fetch(`${BASE_URL}/startups/${myStartup.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ declaration_accepted: true })
  });
  const submitData = await submitRes.json();
  assert.strictEqual(submitRes.status, 200, 'Submission must return 200');
  assert.strictEqual(submitData.data.startup.verification_status, 'SUBMITTED', 'Status must be SUBMITTED');
  console.log('✅ Dossier successfully submitted! Status: SUBMITTED');

  // STEP 12: Editing Lock Verification
  console.log('\n--- 12. Profile Editing Lock When SUBMITTED ---');
  const lockedEditRes = await fetch(`${BASE_URL}/startups/${myStartup.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ company_name: 'Attempted Malicious Override' })
  });
  assert.strictEqual(lockedEditRes.status, 400, 'Profile editing must be locked when SUBMITTED');
  console.log('✅ Editing lock verified: non-admin modifications rejected while under review');

  // Clean up test records
  console.log('\n--- Cleaning up test records ---');
  await prisma.startupDocument.deleteMany({ where: { startup_id: myStartup.id } });
  await prisma.startupBankDetails.deleteMany({ where: { startup_id: myStartup.id } });
  await prisma.startup.delete({ where: { id: myStartup.id } });
  await prisma.user.delete({ where: { id: dbUser.id } });
  console.log('✅ Test cleanup completed');

  console.log('\n===============================================================');
  console.log('🎉 FULL REGISTRATION FLOW VERIFICATION PASSED 100%!');
  console.log('===============================================================');
}

runRegistrationFlowCheck()
  .catch((err) => {
    console.error('\n❌ Registration Flow Check Failed:', err);
    process.exit(1);
  })
  .finally(() => {
    if (server) server.close();
  });
