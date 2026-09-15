import assert from 'assert';
import http from 'http';
import createApp from '../app.js';
import { prisma } from '../config/prisma.js';

let server;
let BASE_URL;

async function request(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runPrismaClientSyncTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING PRISMA CLIENT SYNC REGRESSION TESTS (P0-1)');
  console.log('===============================================================');

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  BASE_URL = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now();
  const createdUserIds = [];
  const createdDeptIds = [];

  try {
    // 1. Create a test department for foreign key validation
    const testDept = await prisma.department.create({
      data: {
        name: `Test Dept Sync ${uniqueSuffix}`,
        state: 'Delhi',
        nodal_officer_name: 'Test Officer',
        contact_email: `officer_${uniqueSuffix}@delhi.gov.in`,
        verification_status: 'VERIFIED'
      }
    });
    createdDeptIds.push(testDept.id);

    // TEST 1: Registration with department_id omitted
    console.log('\n--- TEST 1: Registration with department_id omitted ---');
    const email1 = `sync_omitted_${uniqueSuffix}@teststartup.in`;
    const res1 = await request('POST', '/auth/register', {
      name: 'Startup Omitted Dept',
      email: email1,
      password: 'Password123!@#Secure'
    });

    assert.strictEqual(res1.status, 201, `Expected 201, got ${res1.status}: ${JSON.stringify(res1.body)}`);
    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res1.body.data.user.email, email1);
    assert.strictEqual(res1.body.data.user.department_id, null);
    createdUserIds.push(res1.body.data.user.id);
    console.log('✅ PASS: Registration succeeded with department_id omitted without Prisma validation error.');

    // TEST 2: Registration with explicit department_id = null
    console.log('\n--- TEST 2: Registration with explicit department_id = null ---');
    const email2 = `sync_null_${uniqueSuffix}@teststartup.in`;
    const res2 = await request('POST', '/auth/register', {
      name: 'Startup Null Dept',
      email: email2,
      password: 'Password123!@#Secure',
      department_id: null
    });

    assert.strictEqual(res2.status, 201, `Expected 201, got ${res2.status}: ${JSON.stringify(res2.body)}`);
    assert.strictEqual(res2.body.success, true);
    assert.strictEqual(res2.body.data.user.email, email2);
    assert.strictEqual(res2.body.data.user.department_id, null);
    createdUserIds.push(res2.body.data.user.id);
    console.log('✅ PASS: Registration succeeded with department_id = null.');

    // TEST 3: Registration with valid department_id
    console.log('\n--- TEST 3: Registration with valid department_id ---');
    const email3 = `sync_dept_${uniqueSuffix}@teststartup.in`;
    const res3 = await request('POST', '/auth/register', {
      name: 'Startup With Dept',
      email: email3,
      password: 'Password123!@#Secure',
      department_id: testDept.id
    });

    assert.strictEqual(res3.status, 201, `Expected 201, got ${res3.status}: ${JSON.stringify(res3.body)}`);
    assert.strictEqual(res3.body.success, true);
    assert.strictEqual(res3.body.data.user.email, email3);
    assert.strictEqual(res3.body.data.user.department_id, testDept.id);
    createdUserIds.push(res3.body.data.user.id);

    // Verify directly in DB
    const dbUser = await prisma.user.findUnique({ where: { id: res3.body.data.user.id } });
    assert.strictEqual(dbUser.department_id, testDept.id);
    console.log('✅ PASS: Registration succeeded with valid department_id and verified in DB.');

    // TEST 4: Email verification and login verification
    console.log('\n--- TEST 4: Email verification and login flow ---');
    // Activate and verify user to test login
    await prisma.user.update({
      where: { id: res3.body.data.user.id },
      data: { is_active: true, is_verified: true }
    });

    const loginRes = await request('POST', '/auth/login', {
      email: email3,
      password: 'Password123!@#Secure'
    });

    assert.strictEqual(loginRes.status, 200, `Expected 200, got ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
    assert.strictEqual(loginRes.body.success, true);
    assert.ok(loginRes.body.data.token, 'Token must be present in login response');
    assert.strictEqual(loginRes.body.data.user.department_id, testDept.id);
    console.log('✅ PASS: User login succeeds with JWT and valid department_id.');

    console.log('\n===============================================================');
    console.log('🎉 ALL PRISMA CLIENT SYNC TESTS PASSED SUCCESSFULLY');
    console.log('===============================================================');
  } finally {
    // Cleanup test data
    for (const userId of createdUserIds) {
      try {
        await prisma.startup.deleteMany({ where: { user_id: userId } });
        await prisma.user.delete({ where: { id: userId } });
      } catch {}
    }
    for (const deptId of createdDeptIds) {
      try {
        await prisma.department.delete({ where: { id: deptId } });
      } catch {}
    }
    if (server) {
      server.close();
    }
  }
}

runPrismaClientSyncTests().catch((err) => {
  console.error('❌ Prisma Client Sync Test Suite Failed:', err);
  if (server) server.close();
  process.exit(1);
});
