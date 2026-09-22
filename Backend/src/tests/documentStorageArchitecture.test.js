import assert from 'assert';
import http from 'http';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import storageService, {
  setStorageProvider,
  resetStorageProvider,
  sanitizeStorageKey,
  extractKeyFromUrl
} from '../services/storageService.js';
import { BaseStorageProvider } from '../services/storage/BaseStorageProvider.js';
import { LocalStorageProvider } from '../services/storage/LocalStorageProvider.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const generateToken = (payload) =>
  jwt.sign(
    { userId: payload.id || payload.userId, role: payload.role, email: payload.email, ...payload },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

async function runDocumentStorageArchitectureTests() {
  console.log('================================================================');
  console.log('📦 RUNNING DOCUMENT STORAGE ARCHITECTURE HARDENING TEST SUITE');
  console.log('================================================================');

  // ---------------------------------------------------------------------------
  // SECTION 1: Storage Abstraction & LocalStorageProvider Unit Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Storage Abstraction & Provider Contract ---');

  const testKey = `test-doc-${Date.now()}.pdf`;
  const testBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

  // 1.1: saveBuffer and fileExists
  const saveRes = await storageService.saveBuffer(testKey, testBuffer, { mimeType: 'application/pdf' });
  assert.strictEqual(saveRes.key, testKey);
  assert.strictEqual(saveRes.size, testBuffer.length);
  assert(saveRes.storedAt instanceof Date);
  assert(await storageService.fileExists(testKey), 'File must exist after saveBuffer');
  console.log('✅ [PASS] saveBuffer persisted file and fileExists returned true');

  // 1.2: getFileMetadata
  const meta = await storageService.getFileMetadata(testKey);
  assert(meta !== null);
  assert.strictEqual(meta.key, testKey);
  assert.strictEqual(meta.size, testBuffer.length);
  console.log('✅ [PASS] getFileMetadata returned correct size and metadata');

  // 1.3: getFileStream byte-for-byte read
  const streamData = await storageService.getFileStream(testKey);
  assert(streamData.stream, 'Must return a readable stream');
  assert.strictEqual(streamData.size, testBuffer.length);

  const chunks = [];
  for await (const chunk of streamData.stream) {
    chunks.push(chunk);
  }
  const streamedBuffer = Buffer.concat(chunks);
  assert.deepStrictEqual(streamedBuffer, testBuffer, 'Streamed content must match original buffer exactly');
  console.log('✅ [PASS] getFileStream streamed exact content byte-for-byte');

  // 1.4: deleteFile and idempotent deletion
  const delRes = await storageService.deleteFile(testKey);
  assert.strictEqual(delRes, true);
  assert.strictEqual(await storageService.fileExists(testKey), false, 'File must not exist after delete');

  // Idempotent delete on non-existent file must return false or true without throwing
  const delAgain = await storageService.deleteFile(testKey);
  assert.doesNotThrow(() => delAgain);
  console.log('✅ [PASS] deleteFile deleted physical file cleanly and idempotently');

  // 1.5: Key sanitization & Path traversal defense
  assert.strictEqual(sanitizeStorageKey('valid-file.pdf'), 'valid-file.pdf');
  assert.strictEqual(sanitizeStorageKey('/api/v1/documents/clean-doc.png'), 'clean-doc.png');
  assert.strictEqual(extractKeyFromUrl('http://localhost:5000/api/v1/documents/sample.pdf'), 'sample.pdf');
  assert.strictEqual(extractKeyFromUrl('/uploads/sample.png'), 'sample.png');

  assert.throws(() => sanitizeStorageKey('../../../etc/passwd'), BadRequestError);
  assert.throws(() => sanitizeStorageKey('..\\..\\windows\\system32'), BadRequestError);
  assert.throws(() => sanitizeStorageKey(''), BadRequestError);
  assert.throws(() => sanitizeStorageKey(null), BadRequestError);

  const localProvider = new LocalStorageProvider();
  assert.throws(() => localProvider.resolvePath('../../secret.env'), BadRequestError);
  console.log('✅ [PASS] Path traversal sequences strictly rejected by sanitization and LocalStorageProvider');

  // 1.6: Pluggability / Future Object Storage Readiness (Mock Cloud Provider)
  console.log('\n--- SECTION 1.6: Future Cloud Object Storage Provider Pluggability ---');
  class MockObjectStorageProvider extends BaseStorageProvider {
    constructor() {
      super();
      this.store = new Map();
    }
    async saveBuffer(key, buffer, options = {}) {
      this.store.set(key, { buffer, mimeType: options.mimeType, date: new Date() });
      return { key, size: buffer.length, mimeType: options.mimeType, storedAt: new Date() };
    }
    async fileExists(key) {
      return this.store.has(key);
    }
    async getFileStream(key) {
      const item = this.store.get(key);
      if (!item) throw new NotFoundError('Requested document not found.');
      const { Readable } = await import('stream');
      return { stream: Readable.from(item.buffer), size: item.buffer.length };
    }
    async deleteFile(key) {
      return this.store.delete(key);
    }
    async getFileMetadata(key) {
      const item = this.store.get(key);
      return item ? { key, size: item.buffer.length } : null;
    }
  }

  const mockCloud = new MockObjectStorageProvider();
  setStorageProvider(mockCloud);

  const cloudKey = 'cloud-object-test.pdf';
  await storageService.saveBuffer(cloudKey, testBuffer);
  assert(await storageService.fileExists(cloudKey), 'Mock cloud provider must contain saved object');
  const cloudStream = await storageService.getFileStream(cloudKey);
  assert(cloudStream.stream, 'Mock cloud provider streams data seamlessly');
  await storageService.deleteFile(cloudKey);
  assert.strictEqual(await storageService.fileExists(cloudKey), false);

  // Restore default local provider
  resetStorageProvider();
  assert(storageService.getStorageProvider() instanceof LocalStorageProvider);
  console.log('✅ [PASS] Storage layer successfully swapped with mock cloud provider and restored seamlessly');

  // ---------------------------------------------------------------------------
  // SECTION 2: HTTP Integration Tests on Live Server
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Live HTTP Server Integration Tests ---');

  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const suffix = Date.now();
  let startupUser1, startupUser2, startup1;
  let token1, token2;
  const createdFilesToCleanup = [];

  try {
    const password_hash = await bcrypt.hash('Password123!', 10);

    startupUser1 = await prisma.user.create({
      data: {
        email: `startup_owner_${suffix}@example.com`,
        password_hash,
        name: 'Startup Owner 1',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });
    token1 = generateToken(startupUser1);

    startupUser2 = await prisma.user.create({
      data: {
        email: `unauthorized_user_${suffix}@example.com`,
        password_hash,
        name: 'Unauthorized Startup User 2',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });
    token2 = generateToken(startupUser2);

    startup1 = await prisma.startup.create({
      data: {
        user_id: startupUser1.id,
        company_name: `Storage Test Startup ${suffix}`,
        description: 'Test startup description for storage testing',
        domain: 'CivicTech',
        technologies: ['Node.js'],
        readiness_level: 1,
        location: 'New Delhi',
        verification_status: 'DRAFT',
        verification_source: 'SELF_DECLARED'
      }
    });

    // -------------------------------------------------------------------------
    // TEST 2.1: Successful upload via POST /api/v1/upload
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2.1: Upload file via POST /api/v1/upload ---');
    const dummyPdfContent = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
    const pdfBlob = new Blob([dummyPdfContent], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', pdfBlob, 'company-pan.pdf');

    const uploadRes = await fetch(`${baseUrl}/api/v1/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formData
    });
    assert.strictEqual(uploadRes.status, 201, 'Upload must return 201 Created');
    const uploadData = await uploadRes.json();
    assert(uploadData.data?.file_url, 'Must return file_url');
    assert(uploadData.data?.stored_name, 'Must return stored_name');
    createdFilesToCleanup.push(uploadData.data.stored_name);

    // Verify file exists via storageService
    const physicalExists = await storageService.fileExists(uploadData.data.stored_name);
    assert.strictEqual(physicalExists, true, 'Uploaded file must physically exist in storage');
    console.log('✅ [PASS] File uploaded and confirmed present in storage abstraction:', uploadData.data.stored_name);

    // -------------------------------------------------------------------------
    // TEST 2.2: Authorized document streaming via GET /api/v1/documents/:filename
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2.2: Authorized document streaming ---');
    // Attach document to startup1 in database
    const docRecord = await prisma.startupDocument.create({
      data: {
        startup_id: startup1.id,
        document_type: 'PAN_CARD',
        document_url: uploadData.data.file_url,
        file_name: 'company-pan.pdf',
        mime_type: 'application/pdf',
        verification_status: 'PENDING'
      }
    });

    const getRes = await fetch(uploadData.data.file_url, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getRes.status, 200, 'Authorized retrieval must return 200 OK');
    assert.strictEqual(getRes.headers.get('content-type'), 'application/pdf');
    assert.strictEqual(getRes.headers.get('x-content-type-options'), 'nosniff');
    assert(getRes.headers.get('content-disposition')?.includes('inline'));

    const downloadedText = await getRes.text();
    assert.strictEqual(downloadedText, dummyPdfContent, 'Streamed content must match uploaded file');
    console.log('✅ [PASS] Authorized user streamed document with correct security headers and content');

    // -------------------------------------------------------------------------
    // TEST 2.3: Unauthorized download blocked (HTTP 403)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2.3: Unauthorized download blocked ---');
    const unauthorizedRes = await fetch(uploadData.data.file_url, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(unauthorizedRes.status, 403, 'Unauthorized access must return 403 Forbidden');
    console.log('✅ [PASS] Unauthorized user access correctly blocked with HTTP 403');

    // -------------------------------------------------------------------------
    // TEST 2.4: Missing physical file handled gracefully (HTTP 404)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2.4: Missing physical file handled gracefully ---');
    const ghostKey = '00000000-0000-0000-0000-000000000000.pdf';
    await prisma.startupDocument.create({
      data: {
        startup_id: startup1.id,
        document_type: 'GST_CERTIFICATE',
        document_url: `/api/v1/documents/${ghostKey}`,
        file_name: 'missing-file.pdf',
        mime_type: 'application/pdf',
        verification_status: 'PENDING'
      }
    });

    const missingFileRes = await fetch(`${baseUrl}/api/v1/documents/${ghostKey}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(missingFileRes.status, 404, 'Missing file must return 404 Not Found');
    const missingData = await missingFileRes.json();
    assert.strictEqual(missingData.message, 'Requested document not found.');
    console.log('✅ [PASS] Missing physical file returned controlled HTTP 404 without crashing');

    // -------------------------------------------------------------------------
    // TEST 2.5: Path traversal attempts blocked
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2.5: Path traversal attempts blocked ---');
    const traversalRes1 = await fetch(`${baseUrl}/api/v1/documents/..%2f..%2fpackage.json`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(
      traversalRes1.status === 400 || traversalRes1.status === 404,
      `Path traversal must be rejected with 400 or 404 (received ${traversalRes1.status})`
    );

    const traversalRes2 = await fetch(`${baseUrl}/api/v1/documents/....//package.json`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(
      traversalRes2.status === 400 || traversalRes2.status === 404,
      `Traversal attack must be blocked (received ${traversalRes2.status})`
    );
    console.log('✅ [PASS] Path traversal attacks blocked safely');

    // -------------------------------------------------------------------------
    // TEST 2.6: Document deletion cleans up physical storage
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2.6: Document deletion cleans up storage ---');
    const delDocRes = await fetch(`${baseUrl}/api/v1/startups/${startup1.id}/documents/${docRecord.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(delDocRes.status, 200, 'Document delete must return 200 OK');

    // Verify DB record is gone
    const checkDb = await prisma.startupDocument.findUnique({ where: { id: docRecord.id } });
    assert.strictEqual(checkDb, null, 'Document DB record must be deleted');

    // Verify physical file was removed from storage
    const checkStorage = await storageService.fileExists(uploadData.data.stored_name);
    assert.strictEqual(checkStorage, false, 'Physical file must be deleted from storage on document deletion');
    console.log('✅ [PASS] Document deletion successfully unlinked physical file from storage');

    console.log('\n================================================================');
    console.log('🎉 ALL DOCUMENT STORAGE ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('================================================================');
  } finally {
    console.log('\nCleaning up test fixtures...');
    try {
      for (const key of createdFilesToCleanup) {
        await storageService.deleteFile(key).catch(() => null);
      }
      if (startup1) {
        await prisma.startupDocument.deleteMany({ where: { startup_id: startup1.id } }).catch(() => null);
        await prisma.startup.delete({ where: { id: startup1.id } }).catch(() => null);
      }
      if (startupUser1) await prisma.user.delete({ where: { id: startupUser1.id } }).catch(() => null);
      if (startupUser2) await prisma.user.delete({ where: { id: startupUser2.id } }).catch(() => null);
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr.message);
    }

    await new Promise((resolve) => server.close(resolve));
  }
}

runDocumentStorageArchitectureTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Document storage architecture test failed:', err);
    process.exit(1);
  });
