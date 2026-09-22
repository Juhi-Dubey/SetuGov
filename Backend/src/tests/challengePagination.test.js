import assert from 'assert';
import http from 'http';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { parsePaginationParams, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../utils/pagination.js';
import { BadRequestError } from '../utils/errors.js';

const generateToken = (payload) =>
  jwt.sign(
    { userId: payload.id || payload.userId, role: payload.role, email: payload.email, department_id: payload.department_id, ...payload },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

async function runChallengePaginationTests() {
  console.log('===============================================================');
  console.log('📄 RUNNING CHALLENGE PAGINATION HARDENING TEST SUITE (ITEM #13)');
  console.log('===============================================================');

  // ---------------------------------------------------------------------------
  // SECTION 1: Unit Tests for parsePaginationParams
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Unit Tests for parsePaginationParams ---');

  // Test 1.1: Defaults
  const def = parsePaginationParams({});
  assert.strictEqual(def.page, 1, 'Default page must be 1');
  assert.strictEqual(def.limit, DEFAULT_PAGE_SIZE, `Default limit must be ${DEFAULT_PAGE_SIZE}`);
  assert.strictEqual(def.skip, 0, 'Default skip must be 0');
  assert.strictEqual(def.take, DEFAULT_PAGE_SIZE, `Default take must be ${DEFAULT_PAGE_SIZE}`);
  console.log('✅ [PASS] Default pagination parameters validated (page: 1, limit: 20)');

  // Test 1.2: Valid custom parameters
  const custom = parsePaginationParams({ page: '3', limit: '15' });
  assert.strictEqual(custom.page, 3);
  assert.strictEqual(custom.limit, 15);
  assert.strictEqual(custom.skip, 30);
  assert.strictEqual(custom.take, 15);
  console.log('✅ [PASS] Valid custom parameters (page: 3, limit: 15 -> skip: 30, take: 15)');

  // Test 1.3: Alternative pageSize parameter
  const pageSizeParam = parsePaginationParams({ currentPage: '2', pageSize: '10' });
  assert.strictEqual(pageSizeParam.page, 2);
  assert.strictEqual(pageSizeParam.limit, 10);
  console.log('✅ [PASS] Alternative currentPage / pageSize keys accepted');

  // Test 1.4: Server-side ceiling (capping 1,000 records to 100)
  const capped1000 = parsePaginationParams({ limit: '1000' });
  assert.strictEqual(capped1000.limit, MAX_PAGE_SIZE, `Limit 1000 must be capped to ${MAX_PAGE_SIZE}`);
  assert.strictEqual(capped1000.take, MAX_PAGE_SIZE);

  const capped500 = parsePaginationParams({ limit: '500' });
  assert.strictEqual(capped500.limit, MAX_PAGE_SIZE, `Limit 500 must be capped to ${MAX_PAGE_SIZE}`);
  console.log(`✅ [PASS] Excessive page sizes (1,000 and 500) strictly capped to server maximum (${MAX_PAGE_SIZE})`);

  // Test 1.5: Rejection of zero or negative page
  assert.throws(() => parsePaginationParams({ page: '0' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: 0 }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: '-1' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: -5 }), BadRequestError);
  console.log('✅ [PASS] Zero and negative page rejected with BadRequestError');

  // Test 1.6: Rejection of non-integer / invalid page
  assert.throws(() => parsePaginationParams({ page: 'abc' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: 'NaN' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: '1.5' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: 'Infinity' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: ['1', '2'] }), BadRequestError);
  assert.throws(() => parsePaginationParams({ page: { val: 1 } }), BadRequestError);
  console.log('✅ [PASS] Non-integer, decimal, NaN, Infinity, array, and object page rejected');

  // Test 1.7: Rejection of zero or negative limit
  assert.throws(() => parsePaginationParams({ limit: '0' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ limit: 0 }), BadRequestError);
  assert.throws(() => parsePaginationParams({ limit: '-10' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ limit: -1 }), BadRequestError);
  console.log('✅ [PASS] Zero and negative limit rejected with BadRequestError');

  // Test 1.8: Rejection of non-integer / invalid limit
  assert.throws(() => parsePaginationParams({ limit: 'abc' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ limit: 'NaN' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ limit: '2.5' }), BadRequestError);
  assert.throws(() => parsePaginationParams({ limit: ['10'] }), BadRequestError);
  assert.throws(() => parsePaginationParams({ limit: { limit: 10 } }), BadRequestError);
  console.log('✅ [PASS] Non-integer, decimal, NaN, array, and object limit rejected');

  // ---------------------------------------------------------------------------
  // SECTION 2: Integration Tests on HTTP Server
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Integration Tests on HTTP Server ---');

  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const suffix = Date.now();
  let deptA, deptB, adminUser, govUserA, govUserB, startupUser;
  let adminToken, govTokenA, govTokenB, startupToken;
  const createdChallengeIds = [];

  try {
    const password_hash = await bcrypt.hash('Password123!', 10);

    // Create Departments
    deptA = await prisma.department.create({
      data: {
        name: `Health Dept Pagination Test ${suffix}`,
        department_code: `HDPT_${suffix}`,
        state: 'DELHI',
        contact_email: `health_dept_${suffix}@gov.in`
      }
    });

    deptB = await prisma.department.create({
      data: {
        name: `Urban Dev Pagination Test ${suffix}`,
        department_code: `UDPT_${suffix}`,
        state: 'DELHI',
        contact_email: `urban_dept_${suffix}@gov.in`
      }
    });

    // Create Users
    adminUser = await prisma.user.create({
      data: {
        email: `admin_pag_${suffix}@setugov.in`,
        password_hash,
        name: 'Admin Pagination Tester',
        role: 'ADMIN',
        is_active: true,
        is_verified: true
      }
    });
    adminToken = generateToken(adminUser);

    govUserA = await prisma.user.create({
      data: {
        email: `gov_a_${suffix}@health.gov.in`,
        password_hash,
        name: 'Gov Official A',
        role: 'GOVERNMENT',
        department_id: deptA.id,
        is_active: true,
        is_verified: true
      }
    });
    govTokenA = generateToken(govUserA);

    govUserB = await prisma.user.create({
      data: {
        email: `gov_b_${suffix}@urban.gov.in`,
        password_hash,
        name: 'Gov Official B',
        role: 'GOVERNMENT',
        department_id: deptB.id,
        is_active: true,
        is_verified: true
      }
    });
    govTokenB = generateToken(govUserB);

    startupUser = await prisma.user.create({
      data: {
        email: `startup_pag_${suffix}@example.com`,
        password_hash,
        name: 'Startup Pag Tester',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });
    startupToken = generateToken(startupUser);

    // Seed 25 test challenges:
    // Dept A: 6 PUBLISHED, 3 DRAFT, 1 EVALUATION (10 total)
    // Dept B: 10 PUBLISHED, 3 DRAFT, 2 EVALUATION (15 total)
    console.log('Creating 25 test challenges across departments...');

    for (let i = 1; i <= 10; i++) {
      let status = 'PUBLISHED';
      if (i <= 3) status = 'DRAFT';
      else if (i === 4) status = 'EVALUATION';

      const ch = await prisma.challenge.create({
        data: {
          title: `DeptA Challenge #${i.toString().padStart(2, '0')} - PagTest ${suffix}`,
          problem_description: `Automated problem statement for Dept A item #${i}`,
          current_baseline: 'Manual baseline',
          desired_outcome: 'Automated outcome',
          location: 'Delhi',
          budget_min: 100000,
          budget_max: 500000,
          pilot_duration_days: 60,
          required_technologies: ['AI', 'Cloud'],
          department_id: deptA.id,
          created_by: govUserA.id,
          status
        }
      });
      createdChallengeIds.push(ch.id);
    }

    for (let i = 1; i <= 15; i++) {
      let status = 'PUBLISHED';
      if (i <= 3) status = 'DRAFT';
      else if (i <= 5) status = 'EVALUATION';

      const ch = await prisma.challenge.create({
        data: {
          title: `DeptB Challenge #${i.toString().padStart(2, '0')} - PagTest ${suffix}`,
          problem_description: `Automated problem statement for Dept B item #${i}`,
          current_baseline: 'Manual baseline',
          desired_outcome: 'Automated outcome',
          location: 'Delhi',
          budget_min: 200000,
          budget_max: 800000,
          pilot_duration_days: 90,
          required_technologies: ['IoT', 'Analytics'],
          department_id: deptB.id,
          created_by: govUserB.id,
          status
        }
      });
      createdChallengeIds.push(ch.id);
    }

    console.log(`Seeded ${createdChallengeIds.length} test challenges successfully.`);

    // -------------------------------------------------------------------------
    // TEST 1: Default page size and pagination metadata
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Default page size and pagination metadata ---');
    const res1 = await fetch(`${baseUrl}/api/v1/challenges?search=PagTest%20${suffix}`);
    assert.strictEqual(res1.status, 200);
    const data1 = await res1.json();
    assert(data1.data.challenges, 'Response must contain challenges array');
    assert(data1.data.pagination, 'Response must contain pagination metadata');
    assert.strictEqual(data1.data.pagination.page, 1, 'Default page must be 1');
    assert.strictEqual(data1.data.pagination.limit, 20, 'Default limit must be 20');
    // Public user sees only PUBLISHED (6 from Dept A + 10 from Dept B = 16 total)
    assert.strictEqual(data1.data.pagination.total, 16, 'Total published matches 16');
    assert.strictEqual(data1.data.challenges.length, 16, 'Returns all 16 items within page limit of 20');
    assert.strictEqual(data1.data.pagination.totalPages, 1, 'Total pages should be 1');
    console.log('✅ [PASS] Default pagination verified: page: 1, limit: 20, total: 16, totalPages: 1');

    // -------------------------------------------------------------------------
    // TEST 2: Custom valid pagination (page 1 and page 2 with limit 5)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Custom valid pagination (limit: 5) ---');
    const res2a = await fetch(`${baseUrl}/api/v1/challenges?search=PagTest%20${suffix}&page=1&limit=5`);
    assert.strictEqual(res2a.status, 200);
    const data2a = await res2a.json();
    assert.strictEqual(data2a.data.pagination.page, 1);
    assert.strictEqual(data2a.data.pagination.limit, 5);
    assert.strictEqual(data2a.data.challenges.length, 5, 'Page 1 must have exactly 5 items');
    assert.strictEqual(data2a.data.pagination.totalPages, Math.ceil(16 / 5));

    const res2b = await fetch(`${baseUrl}/api/v1/challenges?search=PagTest%20${suffix}&page=2&limit=5`);
    assert.strictEqual(res2b.status, 200);
    const data2b = await res2b.json();
    assert.strictEqual(data2b.data.pagination.page, 2);
    assert.strictEqual(data2b.data.pagination.limit, 5);
    assert.strictEqual(data2b.data.challenges.length, 5, 'Page 2 must have exactly 5 items');

    // Ensure disjoint IDs between page 1 and page 2
    const page1Ids = new Set(data2a.data.challenges.map((c) => c.id));
    for (const c of data2b.data.challenges) {
      assert(!page1Ids.has(c.id), `ID ${c.id} appears on both page 1 and page 2!`);
    }
    console.log('✅ [PASS] Custom page size (limit: 5) paginates cleanly across pages 1 and 2 with zero overlap');

    // -------------------------------------------------------------------------
    // TEST 3: Capping excessive limit (1,000 and 500 capped to 100)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Capping excessive page sizes (1,000 and 500) ---');
    const res3a = await fetch(`${baseUrl}/api/v1/challenges?limit=1000`);
    assert.strictEqual(res3a.status, 200);
    const data3a = await res3a.json();
    assert.strictEqual(data3a.data.pagination.limit, 100, 'Limit 1000 must be capped to 100');
    assert(data3a.data.challenges.length <= 100, 'Returned items must not exceed 100');

    const res3b = await fetch(`${baseUrl}/api/v1/challenges?limit=500`);
    assert.strictEqual(res3b.status, 200);
    const data3b = await res3b.json();
    assert.strictEqual(data3b.data.pagination.limit, 100, 'Limit 500 must be capped to 100');
    console.log('✅ [PASS] Requests for 1,000 and 500 records are safely capped to 100');

    // -------------------------------------------------------------------------
    // TEST 4: Zero and negative page rejection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Zero and negative page rejection ---');
    const res4Zero = await fetch(`${baseUrl}/api/v1/challenges?page=0`);
    assert.strictEqual(res4Zero.status, 400, 'Page=0 must be rejected with 400');
    const data4Zero = await res4Zero.json();
    assert(data4Zero.message.toLowerCase().includes('page'), 'Error message must specify page error');

    const res4Neg = await fetch(`${baseUrl}/api/v1/challenges?page=-1`);
    assert.strictEqual(res4Neg.status, 400, 'Page=-1 must be rejected with 400');

    const res4NegBig = await fetch(`${baseUrl}/api/v1/challenges?page=-999`);
    assert.strictEqual(res4NegBig.status, 400, 'Page=-999 must be rejected with 400');
    console.log('✅ [PASS] Zero and negative page requests rejected with HTTP 400 Bad Request');

    // -------------------------------------------------------------------------
    // TEST 5: Non-numeric / invalid page rejection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Non-numeric and decimal page rejection ---');
    const res5Abc = await fetch(`${baseUrl}/api/v1/challenges?page=abc`);
    assert.strictEqual(res5Abc.status, 400, 'Page=abc must return 400');

    const res5NaN = await fetch(`${baseUrl}/api/v1/challenges?page=NaN`);
    assert.strictEqual(res5NaN.status, 400, 'Page=NaN must return 400');

    const res5Decimal = await fetch(`${baseUrl}/api/v1/challenges?page=1.5`);
    assert.strictEqual(res5Decimal.status, 400, 'Page=1.5 must return 400');

    const res5Inf = await fetch(`${baseUrl}/api/v1/challenges?page=Infinity`);
    assert.strictEqual(res5Inf.status, 400, 'Page=Infinity must return 400');
    console.log('✅ [PASS] Non-numeric strings, NaN, decimals, and Infinity for page rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 6: Zero, negative, and invalid limit rejection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Zero, negative, and invalid limit rejection ---');
    const res6Zero = await fetch(`${baseUrl}/api/v1/challenges?limit=0`);
    assert.strictEqual(res6Zero.status, 400, 'Limit=0 must return 400');

    const res6Neg = await fetch(`${baseUrl}/api/v1/challenges?limit=-5`);
    assert.strictEqual(res6Neg.status, 400, 'Limit=-5 must return 400');

    const res6Abc = await fetch(`${baseUrl}/api/v1/challenges?limit=invalid`);
    assert.strictEqual(res6Abc.status, 400, 'Limit=invalid must return 400');

    const res6NaN = await fetch(`${baseUrl}/api/v1/challenges?limit=NaN`);
    assert.strictEqual(res6NaN.status, 400, 'Limit=NaN must return 400');

    const res6Dec = await fetch(`${baseUrl}/api/v1/challenges?limit=3.7`);
    assert.strictEqual(res6Dec.status, 400, 'Limit=3.7 must return 400');
    console.log('✅ [PASS] Zero, negative, non-numeric, and decimal limits rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 7: Filtering + pagination combined
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Filtering + pagination combined ---');
    // Filter by Dept A + search
    const res7Dept = await fetch(
      `${baseUrl}/api/v1/challenges?department_id=${deptA.id}&search=PagTest%20${suffix}&page=1&limit=3`
    );
    assert.strictEqual(res7Dept.status, 200);
    const data7Dept = await res7Dept.json();
    assert.strictEqual(data7Dept.data.pagination.limit, 3);
    assert.strictEqual(data7Dept.data.challenges.length, 3);
    // Unauthenticated user sees only PUBLISHED in Dept A (6 items)
    assert.strictEqual(data7Dept.data.pagination.total, 6);
    assert.strictEqual(data7Dept.data.pagination.totalPages, 2);
    for (const ch of data7Dept.data.challenges) {
      assert.strictEqual(ch.department.id, deptA.id);
      assert.strictEqual(ch.status, 'PUBLISHED');
    }
    console.log('✅ [PASS] Department filter + pagination combined accurately');

    // -------------------------------------------------------------------------
    // TEST 8: Role-specific visibility & pagination RBAC integrity
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Role-specific visibility & pagination RBAC ---');
    // 8a. Government User A sees ONLY Dept A challenges (all 10: 6 PUBLISHED + 3 DRAFT + 1 EVALUATION)
    const res8GovA = await fetch(`${baseUrl}/api/v1/challenges?search=PagTest%20${suffix}&limit=50`, {
      headers: { Authorization: `Bearer ${govTokenA}` }
    });
    assert.strictEqual(res8GovA.status, 200);
    const data8GovA = await res8GovA.json();
    assert.strictEqual(data8GovA.data.pagination.total, 10, 'Gov A sees exactly 10 Dept A challenges');
    for (const ch of data8GovA.data.challenges) {
      assert.strictEqual(ch.department.id, deptA.id, 'Gov A must never see Dept B challenges');
    }
    console.log('✅ [PASS] Government User A scoped strictly to Department A (10 challenges, includes DRAFT)');

    // 8b. Startup sees all non-draft challenges across departments (Dept A: 6 pub + 1 eval = 7; Dept B: 10 pub + 2 eval = 12 -> 19 total)
    const res8Startup = await fetch(`${baseUrl}/api/v1/challenges?search=PagTest%20${suffix}&limit=50`, {
      headers: { Authorization: `Bearer ${startupToken}` }
    });
    assert.strictEqual(res8Startup.status, 200);
    const data8Startup = await res8Startup.json();
    assert.strictEqual(data8Startup.data.pagination.total, 19, 'Startup sees 19 non-draft challenges across departments');
    for (const ch of data8Startup.data.challenges) {
      assert.notStrictEqual(ch.status, 'DRAFT', 'Startup must NEVER see DRAFT challenges');
    }
    console.log('✅ [PASS] Startup sees 19 non-draft challenges across all departments');

    // 8c. Admin sees ALL 25 challenges
    const res8Admin = await fetch(`${baseUrl}/api/v1/challenges?search=PagTest%20${suffix}&limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res8Admin.status, 200);
    const data8Admin = await res8Admin.json();
    assert.strictEqual(data8Admin.data.pagination.total, 25, 'Admin sees all 25 challenges');
    console.log('✅ [PASS] Admin sees all 25 seeded challenges');

    // -------------------------------------------------------------------------
    // TEST 9: Deterministic ordering verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Deterministic ordering verification ---');
    const orderRuns = [];
    for (let i = 0; i < 3; i++) {
      const runRes = await fetch(`${baseUrl}/api/v1/challenges?search=PagTest%20${suffix}&page=1&limit=8`);
      const runData = await runRes.json();
      orderRuns.push(runData.data.challenges.map((c) => c.id));
    }

    // Compare all runs for strict equality
    assert.deepStrictEqual(orderRuns[0], orderRuns[1], 'Run 1 and Run 2 must have identical order');
    assert.deepStrictEqual(orderRuns[1], orderRuns[2], 'Run 2 and Run 3 must have identical order');
    console.log('✅ [PASS] Ordering is 100% deterministic across multiple sequential page requests');

    console.log('\n===============================================================');
    console.log('🎉 ALL CHALLENGE PAGINATION TESTS PASSED (100% SUCCESS) 🎉');
    console.log('===============================================================');
  } finally {
    // Teardown test fixtures
    console.log('\nCleaning up test fixtures...');
    try {
      if (createdChallengeIds.length > 0) {
        await prisma.challenge.deleteMany({
          where: { id: { in: createdChallengeIds } }
        });
      }
      if (govUserA) await prisma.user.delete({ where: { id: govUserA.id } }).catch(() => null);
      if (govUserB) await prisma.user.delete({ where: { id: govUserB.id } }).catch(() => null);
      if (startupUser) await prisma.user.delete({ where: { id: startupUser.id } }).catch(() => null);
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => null);
      if (deptA) await prisma.department.delete({ where: { id: deptA.id } }).catch(() => null);
      if (deptB) await prisma.department.delete({ where: { id: deptB.id } }).catch(() => null);
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr.message);
    }

    await new Promise((resolve) => server.close(resolve));
  }
}

runChallengePaginationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Challenge pagination test failed:', err);
    process.exit(1);
  });
