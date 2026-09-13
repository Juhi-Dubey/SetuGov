import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';

const BASE_URL = 'http://localhost:5000/api/v1';

async function runUploadTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING FILE UPLOAD & ATTACHMENT SUITE');
  console.log('===============================================================');

  // Step 1: Login as Startup
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vikas@mediqueue.ai', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.token;
  const user = loginData?.data?.user;
  assert(token, 'Startup token must be obtained');
  console.log('✅ [PASS] Startup logged in:', user.name);

  // Get Startup Profile
  const startup = await prisma.startup.findFirst({ where: { user_id: user.id } });
  assert(startup, 'Startup profile must exist in DB');
  console.log('✅ [PASS] Startup profile resolved:', startup.id, startup.company_name);

  // Test 1: Upload PDF via POST /api/v1/upload
  console.log('\n--- TEST 1: Generic PDF Upload (POST /api/v1/upload) ---');
  const dummyPdf = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
  const pdfBlob = new Blob([dummyPdf], { type: 'application/pdf' });
  const form1 = new FormData();
  form1.append('file', pdfBlob, 'company-registration.pdf');

  const uploadPdfRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form1
  });
  const uploadPdfData = await uploadPdfRes.json();
  assert.strictEqual(uploadPdfRes.status, 201, 'PDF upload must return 201');
  assert(uploadPdfData.data?.file_url, 'Must return file_url');
  assert.strictEqual(uploadPdfData.data?.mime_type, 'application/pdf');
  console.log('✅ [PASS] PDF uploaded successfully:', uploadPdfData.data.file_url);

  // Test 2: Verify Static File Access via GET
  console.log('\n--- TEST 2: Static File Serving (GET /uploads/:filename) ---');
  const staticRes = await fetch(uploadPdfData.data.file_url);
  assert.strictEqual(staticRes.status, 200, 'Static file fetch must return 200 OK');
  assert.strictEqual(staticRes.headers.get('content-type'), 'application/pdf');
  console.log('✅ [PASS] Static PDF retrieved with correct content-type header');

  // Test 3: Upload PNG Image via POST /api/v1/upload
  console.log('\n--- TEST 3: Image Upload (PNG) ---');
  const dummyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pngBlob = new Blob([dummyPng], { type: 'image/png' });
  const form2 = new FormData();
  form2.append('file', pngBlob, 'telemetry-dashboard.png');

  const uploadPngRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form2
  });
  const uploadPngData = await uploadPngRes.json();
  assert.strictEqual(uploadPngRes.status, 201, 'PNG upload must return 201');
  assert.strictEqual(uploadPngData.data?.mime_type, 'image/png');
  console.log('✅ [PASS] PNG uploaded successfully:', uploadPngData.data.file_url);

  // Test 4: Direct Multipart Upload to Startup Documents (POST /api/v1/startups/:id/documents)
  console.log('\n--- TEST 4: Direct Multipart Upload to Startup Documents ---');
  const form3 = new FormData();
  form3.append('file', pdfBlob, 'dpiit-certificate.pdf');
  form3.append('document_type', 'DPIIT_RECOGNITION');

  const docRes = await fetch(`${BASE_URL}/startups/${startup.id}/documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form3
  });
  const docData = await docRes.json();
  assert.strictEqual(docRes.status, 201, 'Startup document direct upload must return 201');
  assert(docData.data?.document?.document_url, 'Must return created document with document_url');
  assert.strictEqual(docData.data?.document?.document_type, 'DPIIT_RECOGNITION');
  console.log('✅ [PASS] Startup document record persisted:', docData.data.document.id);

  // Test 5: Direct Multipart Upload to Pilot Evidence (POST /api/v1/pilots/:pilot_id/evidence)
  console.log('\n--- TEST 5: Direct Multipart Upload to Pilot Evidence ---');
  const pilot = await prisma.pilot.findFirst();
  assert(pilot, 'Pilot must exist in DB for evidence test');

  const form4 = new FormData();
  form4.append('file', pngBlob, 'sensor-calibration.png');
  form4.append('type', 'TELEMETRY_LOG');
  form4.append('description', 'IoT telemetry load metrics for ward 4.');
  form4.append('source', 'STARTUP_UPLOAD');

  const evRes = await fetch(`${BASE_URL}/pilots/${pilot.id}/evidence`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form4
  });
  const evData = await evRes.json();
  assert.strictEqual(evRes.status, 201, 'Pilot evidence upload must return 201');
  assert(evData.data?.evidence?.file_url, 'Must return created evidence with file_url');
  assert.strictEqual(evData.data?.evidence?.type, 'TELEMETRY_LOG');
  console.log('✅ [PASS] Pilot evidence record persisted:', evData.data.evidence.id);

  // Test 6: Rejection of Disallowed File Extensions (.exe, .sh)
  console.log('\n--- TEST 6: Reject Disallowed File Types (.exe) ---');
  const fakeExe = 'MZ\\x90\\x00\\x03';
  const exeBlob = new Blob([fakeExe], { type: 'application/x-msdownload' });
  const form5 = new FormData();
  form5.append('file', exeBlob, 'malware.exe');

  const rejectRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form5
  });
  assert.strictEqual(rejectRes.status, 400, 'Invalid file extension must return 400 Bad Request');
  console.log('✅ [PASS] Dangerous file upload correctly rejected (400 Bad Request)');

  // Test 7: Rejection of Unauthenticated Uploads
  console.log('\n--- TEST 7: Reject Unauthenticated Upload ---');
  const unauthRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: form1
  });
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated upload must return 401 Unauthorized');
  console.log('✅ [PASS] Unauthenticated upload blocked (401)');

  console.log('\n===============================================================');
  console.log('🎉 ALL FILE UPLOAD TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('===============================================================');
  process.exit(0);
}

runUploadTests().catch((err) => {
  console.error('❌ File upload test failure:', err);
  process.exit(1);
});
