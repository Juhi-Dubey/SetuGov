import assert from 'assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import storageService from '../services/storageService.js';
import { BadRequestError } from '../utils/errors.js';

const generateToken = (payload) =>
  jwt.sign(
    { userId: payload.id || payload.userId, id: payload.id || payload.userId, role: payload.role, email: payload.email },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

const runTests = async () => {
  console.log('===============================================================');
  console.log('🧪 RUNNING TASK 5: DOCUMENT RECORD PHYSICAL EXISTENCE VERIFICATION SUITE');
  console.log('===============================================================');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();
  const realFileKey = `physical-test-doc-${timestamp}.pdf`;
  const realFileBuffer = Buffer.from('%PDF-1.4 physical existence test document content ' + timestamp);
  const ghostFileKey = `ghost-test-doc-${timestamp}.pdf`;

  let testStartupUser;
  let testStartup;
  let testGovUser;
  let testPilot;
  let startupToken;
  let govToken;

  try {
    // -------------------------------------------------------------------------
    // PART 1: Direct Storage Abstraction Unit Tests (verifyDocumentFile)
    // -------------------------------------------------------------------------
    console.log('\n--- PART 1: Storage Abstraction verifyDocumentFile() Checks ---');

    // 1.1 Persist a real physical file into storage
    await storageService.saveBuffer(realFileKey, realFileBuffer);
    const physicallyExists = await storageService.fileExists(realFileKey);
    assert.strictEqual(physicallyExists, true, 'Physical test file must exist in storage');

    // 1.2 Real existing file -> allowed and metadata extracted
    const verifiedReal = await storageService.verifyDocumentFile(realFileKey);
    assert.strictEqual(verifiedReal.key, realFileKey, 'Storage key must match');
    assert.strictEqual(verifiedReal.normalizedUrl, `/api/v1/documents/${realFileKey}`, 'Normalized URL must use canonical endpoint');
    assert.strictEqual(verifiedReal.metadata?.size, realFileBuffer.length, 'Metadata size must match physical file size');
    console.log('✅ [PASS] Real existing file allowed, canonical URL returned, metadata retrieved:', verifiedReal);

    // 1.3 Missing physical file -> rejected (400)
    let missingError = null;
    try {
      await storageService.verifyDocumentFile(ghostFileKey);
    } catch (err) {
      missingError = err;
    }
    assert(missingError instanceof BadRequestError, 'Missing file must throw BadRequestError');
    assert(missingError.message.includes('does not exist in storage'), 'Error message must cite missing storage file');
    console.log('✅ [PASS] Missing physical file rejected with BadRequestError (400):', missingError.message);

    // 1.4 Traversal attempts -> rejected (400)
    const traversalAttempts = [
      '../../etc/passwd',
      '..\\..\\windows\\win.ini',
      '/api/v1/documents/../../etc/passwd',
      '%2e%2e%2f%2e%2e%2fpackage.json',
      '../uploads/test.pdf'
    ];

    for (const trav of traversalAttempts) {
      let travError = null;
      try {
        await storageService.verifyDocumentFile(trav);
      } catch (err) {
        travError = err;
      }
      assert(travError instanceof BadRequestError, `Traversal path '${trav}' must throw BadRequestError`);
      console.log(`✅ [PASS] Traversal attempt rejected: '${trav}' -> ${travError.message}`);
    }

    // 1.5 Outside-storage path -> rejected (400)
    const outsidePaths = [
      'C:\\Windows\\System32\\calc.exe',
      '/etc/passwd',
      '/var/log/syslog',
      '/api/v1/users/profile.jpg'
    ];

    for (const outside of outsidePaths) {
      let outsideError = null;
      try {
        await storageService.verifyDocumentFile(outside);
      } catch (err) {
        outsideError = err;
      }
      assert(outsideError instanceof BadRequestError, `Outside-storage path '${outside}' must throw BadRequestError`);
      console.log(`✅ [PASS] Outside-storage path rejected: '${outside}' -> ${outsideError.message}`);
    }

    // 1.6 External arbitrary URLs -> rejected (400)
    const externalUrls = [
      'https://malicious.example.com/exploit.pdf',
      'http://attacker.org/fake.pdf',
      'https://phishing.net/api/v1/documents/doc.pdf'
    ];

    for (const extUrl of externalUrls) {
      let extError = null;
      try {
        await storageService.verifyDocumentFile(extUrl);
      } catch (err) {
        extError = err;
      }
      assert(extError instanceof BadRequestError, `External URL '${extUrl}' must throw BadRequestError`);
      console.log(`✅ [PASS] External arbitrary URL rejected: '${extUrl}' -> ${extError.message}`);
    }

    // -------------------------------------------------------------------------
    // PART 2: Startup Document API Integration Tests
    // -------------------------------------------------------------------------
    console.log('\n--- PART 2: Startup Document API Integration Tests ---');

    testStartupUser = await prisma.user.create({
      data: {
        email: `startup.doc.test.${timestamp}@example.com`,
        password_hash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6e/14/N.k3z0W/Fq6',
        name: 'Doc Integrity Startup',
        role: 'STARTUP'
      }
    });

    testStartup = await prisma.startup.create({
      data: {
        user_id: testStartupUser.id,
        company_name: `Doc Integrity Startup ${timestamp}`,
        description: 'A test startup for doc integrity tests.',
        domain: 'Technology',
        location: 'Bengaluru, Karnataka',
        verification_status: 'PENDING'
      }
    });

    startupToken = generateToken({
      id: testStartupUser.id,
      email: testStartupUser.email,
      role: 'STARTUP'
    });

    // 2.1 Missing file -> rejected (HTTP 400), DB record NOT created
    console.log('\nTesting Startup Document: Missing file submission...');
    const missingDocRes = await fetch(`${baseUrl}/api/v1/startups/${testStartup.id}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${startupToken}`
      },
      body: JSON.stringify({
        document_type: 'PAN',
        document_url: `/api/v1/documents/${ghostFileKey}`,
        file_name: 'ghost_pan.pdf'
      })
    });
    const missingDocData = await missingDocRes.json();
    assert.strictEqual(missingDocRes.status, 400, 'Missing physical file must return HTTP 400');
    assert(missingDocData.message?.includes('does not exist in storage'), 'Response must cite missing physical file');
    
    const countMissingDb = await prisma.startupDocument.count({
      where: {
        startup_id: testStartup.id,
        document_url: { contains: ghostFileKey }
      }
    });
    assert.strictEqual(countMissingDb, 0, 'No DB record must be created for missing physical file');
    console.log('✅ [PASS] Startup document with missing file rejected (400) and DB record prevented');

    // 2.2 Traversal attempt -> rejected (HTTP 400), DB record NOT created
    console.log('\nTesting Startup Document: Traversal attempt submission...');
    const travDocRes = await fetch(`${baseUrl}/api/v1/startups/${testStartup.id}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${startupToken}`
      },
      body: JSON.stringify({
        document_type: 'INCORPORATION_CERTIFICATE',
        document_url: '/api/v1/documents/../../package.json',
        file_name: 'incorp.pdf'
      })
    });
    assert.strictEqual(travDocRes.status, 400, 'Traversal attempt must return HTTP 400');
    console.log('✅ [PASS] Startup document with traversal path rejected (400)');

    // 2.3 Outside storage path -> rejected (HTTP 400), DB record NOT created
    console.log('\nTesting Startup Document: Outside storage path submission...');
    const outsideDocRes = await fetch(`${baseUrl}/api/v1/startups/${testStartup.id}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${startupToken}`
      },
      body: JSON.stringify({
        document_type: 'BANK_PROOF',
        document_url: '/api/v1/auth/login',
        file_name: 'bank.pdf'
      })
    });
    assert.strictEqual(outsideDocRes.status, 400, 'Outside storage path must return HTTP 400');
    console.log('✅ [PASS] Startup document with outside storage path rejected (400)');

    // 2.4 Real existing file -> allowed (HTTP 201) & DB record created with metadata
    console.log('\nTesting Startup Document: Real existing file submission...');
    const validDocRes = await fetch(`${baseUrl}/api/v1/startups/${testStartup.id}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${startupToken}`
      },
      body: JSON.stringify({
        document_type: 'PAN',
        document_url: `/api/v1/documents/${realFileKey}`,
        file_name: 'verified_pan.pdf'
      })
    });
    const validDocData = await validDocRes.json();
    assert.strictEqual(validDocRes.status, 201, 'Real existing file must return HTTP 201');
    assert(validDocData.data?.document?.id, 'Document record must be returned');
    assert.strictEqual(validDocData.data.document.file_size, realFileBuffer.length, 'File size must match physical file metadata');
    assert.strictEqual(validDocData.data.document.document_url, `/api/v1/documents/${realFileKey}`, 'Document URL must be normalized');

    const createdDbDoc = await prisma.startupDocument.findUnique({
      where: { id: validDocData.data.document.id }
    });
    assert(createdDbDoc, 'Startup document record must exist in DB');
    assert.strictEqual(createdDbDoc.file_size, realFileBuffer.length, 'DB record file_size must match physical metadata');
    console.log('✅ [PASS] Real existing file allowed: DB record created with physical metadata verified:', createdDbDoc.id);

    // -------------------------------------------------------------------------
    // PART 3: Pilot Evidence API Integration Tests
    // -------------------------------------------------------------------------
    console.log('\n--- PART 3: Pilot Evidence API Integration Tests ---');

    testPilot = await prisma.pilot.findFirst();
    assert(testPilot, 'A pilot must exist in the database for testing evidence');

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    assert(adminUser, 'Admin user must exist in database');

    const adminToken = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN'
    });

    // 3.1 Pilot Evidence: Missing physical file -> rejected (400), DB record NOT created
    console.log('\nTesting Pilot Evidence: Missing file submission...');
    const missingEvRes = await fetch(`${baseUrl}/api/v1/pilots/${testPilot.id}/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        type: 'TEST_REPORT',
        description: 'Missing evidence document report',
        file_url: `/api/v1/documents/${ghostFileKey}`,
        source: 'GOVERNMENT_AUDIT'
      })
    });
    const missingEvData = await missingEvRes.json();
    assert.strictEqual(missingEvRes.status, 400, 'Missing physical evidence file must return HTTP 400');
    assert(missingEvData.message?.includes('does not exist in storage'), 'Error message must cite missing file in storage');

    const countMissingEv = await prisma.evidence.count({
      where: {
        pilot_id: testPilot.id,
        file_url: { contains: ghostFileKey }
      }
    });
    assert.strictEqual(countMissingEv, 0, 'No DB record must be created for missing physical evidence file');
    console.log('✅ [PASS] Pilot evidence with missing file rejected (400) and DB record prevented');

    // 3.2 Pilot Evidence: Traversal attempt -> rejected (400)
    console.log('\nTesting Pilot Evidence: Traversal attempt submission...');
    const travEvRes = await fetch(`${baseUrl}/api/v1/pilots/${testPilot.id}/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        type: 'TEST_REPORT',
        description: 'Traversal attempt evidence',
        file_url: '../../package.json',
        source: 'GOVERNMENT_AUDIT'
      })
    });
    assert.strictEqual(travEvRes.status, 400, 'Traversal evidence URL must return HTTP 400');
    console.log('✅ [PASS] Pilot evidence with traversal URL rejected (400)');

    // 3.3 Pilot Evidence: Real existing file -> allowed (201) & DB record created
    console.log('\nTesting Pilot Evidence: Real existing file submission...');
    const validEvRes = await fetch(`${baseUrl}/api/v1/pilots/${testPilot.id}/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        type: 'AUDIT_PROOF',
        description: 'Verified test run evidence report',
        file_url: `/api/v1/documents/${realFileKey}`,
        source: 'GOVERNMENT_AUDIT'
      })
    });
    const validEvData = await validEvRes.json();
    assert.strictEqual(validEvRes.status, 201, 'Real existing evidence file must return HTTP 201');
    assert(validEvData.data?.evidence?.id, 'Evidence ID must be returned');

    const createdDbEv = await prisma.evidence.findUnique({
      where: { id: validEvData.data.evidence.id }
    });
    assert(createdDbEv, 'Evidence record must exist in DB');
    assert.strictEqual(createdDbEv.file_url, `/api/v1/documents/${realFileKey}`);
    console.log('✅ [PASS] Real existing evidence allowed and DB record created:', createdDbEv.id);

    console.log('\n===============================================================');
    console.log('🎉 ALL DOCUMENT PHYSICAL EXISTENCE VERIFICATION TESTS PASSED! 🎉');
    console.log('===============================================================');
  } finally {
    // Teardown
    await storageService.deleteFile(realFileKey).catch(() => null);

    if (testPilot) {
      await prisma.evidence.deleteMany({ where: { file_url: { contains: realFileKey } } }).catch(() => null);
    }
    if (testStartup) {
      await prisma.startupDocument.deleteMany({ where: { startup_id: testStartup.id } }).catch(() => null);
      await prisma.startup.delete({ where: { id: testStartup.id } }).catch(() => null);
    }
    if (testStartupUser) {
      await prisma.user.delete({ where: { id: testStartupUser.id } }).catch(() => null);
    }

    server.close();
  }
};

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
