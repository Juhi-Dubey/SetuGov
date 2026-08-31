
import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runPhase2Tests = async () => {
  logger.info('🧪 Starting Phase 2 (Users, Departments, Auth, RBAC, Admin) Tests...');

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
        res.on('data', chunk => (resBody += chunk));
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
    const timestamp = Date.now();

    // 1. Verify Admin Self-Registration is blocked (P0-1) and Login Seeded Admin User
    logger.info('1. Verifying Admin self-registration is blocked and logging in as seeded Admin...');
    const adminRegBlocked = await request('POST', '/api/v1/auth/register', {
      name: 'Rogue Admin',
      email: `rogue.admin.${timestamp}@setugov.in`,
      password: 'SecureAdminPassword123!',
      role: 'ADMIN'
    });
    if (adminRegBlocked.statusCode !== 422 && adminRegBlocked.statusCode !== 403) {
      throw new Error(`Admin self-registration should be blocked: ${JSON.stringify(adminRegBlocked)}`);
    }
    logger.info('✅ Admin self-registration blocked correctly (422)');

    const adminLoginRes = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    if (adminLoginRes.statusCode !== 200 || !adminLoginRes.body.success) {
      throw new Error(`Admin Login failed: ${JSON.stringify(adminLoginRes)}`);
    }
    const adminToken = adminLoginRes.body.data.token;
    const adminUser = adminLoginRes.body.data.user;
    logger.info(`✅ Admin authenticated: ${adminUser.email}`);

    // Register Startup and Evaluator Users for RBAC testing
    const startupRegRes = await request('POST', '/api/v1/auth/register', {
      name: 'Startup Founder',
      email: `startup.${timestamp}@tech.io`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const startupToken = startupRegRes.body.data.token;

    const evalRegRes = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Evaluator',
      email: `evaluator.${timestamp}@panel.org`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const evalToken = evalRegRes.body.data.token;

    // 2. ADMIN can create a department
    logger.info('2. Testing ADMIN can create a department...');
    const deptName1 = `Department of Health & Family Welfare ${timestamp}`;
    const depRes = await request('POST', '/api/v1/departments', {
      name: deptName1,
      state: 'Karnataka',
      contact_email: `health.${timestamp}@gov.in`
    }, adminToken);
    if (depRes.statusCode !== 201 || !depRes.body.success) {
      throw new Error(`Admin Create Department failed: ${JSON.stringify(depRes)}`);
    }
    const department1 = depRes.body.data.department;
    logger.info(`✅ ADMIN created department: ${department1.name} (${department1.id})`);

    // 3. Duplicate department creation is rejected
    logger.info('3. Testing duplicate department creation rejection (409 Conflict)...');
    const dupDepRes = await request('POST', '/api/v1/departments', {
      name: deptName1,
      state: 'Karnataka',
      contact_email: `duplicate.health.${timestamp}@gov.in`
    }, adminToken);
    if (dupDepRes.statusCode !== 409 || dupDepRes.body.success !== false) {
      throw new Error(`Duplicate department creation should return 409, got: ${JSON.stringify(dupDepRes)}`);
    }
    logger.info('✅ Duplicate department creation properly rejected with 409 Conflict');

    // 4. Admin creates a second department for cross-department update testing
    logger.info('4. Admin creating second department for isolation testing...');
    const deptName2 = `Department of Urban Transport ${timestamp}`;
    const dep2Res = await request('POST', '/api/v1/departments', {
      name: deptName2,
      state: 'Karnataka',
      contact_email: `transport.${timestamp}@gov.in`
    }, adminToken);
    if (dep2Res.statusCode !== 201 || !dep2Res.body.success) {
      throw new Error(`Admin Create Department 2 failed: ${JSON.stringify(dep2Res)}`);
    }
    const department2 = dep2Res.body.data.department;
    logger.info(`✅ ADMIN created second department: ${department2.name} (${department2.id})`);

    // 5. Register Government Users assigned to Dept 1 and Dept 2
    logger.info('5. Registering Government users for Dept 1 and Dept 2...');
    const govEmail1 = `ramesh.${timestamp}@health.gov.in`;
    const govRegRes1 = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Ramesh Kumar',
      email: govEmail1,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: department1.id
    });
    if (govRegRes1.statusCode !== 201 || !govRegRes1.body.success) {
      throw new Error(`Government Register 1 failed: ${JSON.stringify(govRegRes1)}`);
    }
    const govToken1 = govRegRes1.body.data.token;
    const govUser1 = govRegRes1.body.data.user;
    const govEmail = govEmail1;
    const govToken = govToken1;
    const govUser = govUser1;

    const govEmail2 = `suresh.${timestamp}@transport.gov.in`;
    const govRegRes2 = await request('POST', '/api/v1/auth/register', {
      name: 'Suresh Patil',
      email: govEmail2,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: department2.id
    });
    const govToken2 = govRegRes2.body.data.token;
    logger.info(`✅ Government users registered: ${govUser1.email} (Dept 1) & ${govEmail2} (Dept 2)`);

    // 6. GOVERNMENT cannot create a department (403 Forbidden)
    logger.info('6. Testing GOVERNMENT cannot create a department (403 Forbidden)...');
    const govCreateRes = await request('POST', '/api/v1/departments', {
      name: `Unauthorized Dept ${timestamp}`,
      state: 'Karnataka',
      contact_email: `unauth.${timestamp}@gov.in`
    }, govToken1);
    if (govCreateRes.statusCode !== 403 || govCreateRes.body.success !== false) {
      throw new Error(`Government creating department should return 403, got: ${JSON.stringify(govCreateRes)}`);
    }
    logger.info('✅ GOVERNMENT blocked from creating department with 403 Forbidden');

    // 7. STARTUP cannot create or update departments (403 Forbidden)
    logger.info('7. Testing STARTUP cannot create or update departments (403 Forbidden)...');
    const startupCreateRes = await request('POST', '/api/v1/departments', {
      name: `Startup Dept ${timestamp}`,
      state: 'Karnataka',
      contact_email: `startup.${timestamp}@gov.in`
    }, startupToken);
    if (startupCreateRes.statusCode !== 403) {
      throw new Error(`Startup creating department should return 403, got: ${JSON.stringify(startupCreateRes)}`);
    }

    const startupUpdateRes = await request('PATCH', `/api/v1/departments/${department1.id}`, {
      contact_email: 'hacked.health@gov.in'
    }, startupToken);
    if (startupUpdateRes.statusCode !== 403) {
      throw new Error(`Startup updating department should return 403, got: ${JSON.stringify(startupUpdateRes)}`);
    }
    logger.info('✅ STARTUP blocked from creating and updating departments with 403 Forbidden');

    // 8. EVALUATOR cannot create or update departments (403 Forbidden)
    logger.info('8. Testing EVALUATOR cannot create or update departments (403 Forbidden)...');
    const evalCreateRes = await request('POST', '/api/v1/departments', {
      name: `Eval Dept ${timestamp}`,
      state: 'Karnataka',
      contact_email: `eval.${timestamp}@gov.in`
    }, evalToken);
    if (evalCreateRes.statusCode !== 403) {
      throw new Error(`Evaluator creating department should return 403, got: ${JSON.stringify(evalCreateRes)}`);
    }

    const evalUpdateRes = await request('PATCH', `/api/v1/departments/${department1.id}`, {
      contact_email: 'eval.health@gov.in'
    }, evalToken);
    if (evalUpdateRes.statusCode !== 403) {
      throw new Error(`Evaluator updating department should return 403, got: ${JSON.stringify(evalUpdateRes)}`);
    }
    logger.info('✅ EVALUATOR blocked from creating and updating departments with 403 Forbidden');

    // 9. GOVERNMENT cannot update another department (403 Forbidden)
    logger.info('9. Testing GOVERNMENT cannot update another department (403 Forbidden)...');
    const govCrossUpdateRes = await request('PATCH', `/api/v1/departments/${department2.id}`, {
      contact_email: 'cross.updated@gov.in'
    }, govToken1);
    if (govCrossUpdateRes.statusCode !== 403 || govCrossUpdateRes.body.success !== false) {
      throw new Error(`Government updating another department should return 403, got: ${JSON.stringify(govCrossUpdateRes)}`);
    }
    logger.info('✅ GOVERNMENT blocked from updating another department with 403 Forbidden');

    // 10. GOVERNMENT can update their own department (200 OK)
    logger.info('10. Testing GOVERNMENT can update their own department (200 OK)...');
    const updatedEmail1 = `updated.health.${timestamp}@gov.in`;
    const govOwnUpdateRes = await request('PATCH', `/api/v1/departments/${department1.id}`, {
      contact_email: updatedEmail1
    }, govToken1);
    if (govOwnUpdateRes.statusCode !== 200 || govOwnUpdateRes.body.data.department.contact_email !== updatedEmail1) {
      throw new Error(`Government updating own department failed: ${JSON.stringify(govOwnUpdateRes)}`);
    }
    logger.info('✅ GOVERNMENT successfully updated their own assigned department');

    // 11. ADMIN can update any department (200 OK)
    logger.info('11. Testing ADMIN can update any department (200 OK)...');
    const adminUpdatedEmail2 = `admin.updated.transport.${timestamp}@gov.in`;
    const adminUpdateRes = await request('PATCH', `/api/v1/departments/${department2.id}`, {
      contact_email: adminUpdatedEmail2
    }, adminToken);
    if (adminUpdateRes.statusCode !== 200 || adminUpdateRes.body.data.department.contact_email !== adminUpdatedEmail2) {
      throw new Error(`Admin updating department 2 failed: ${JSON.stringify(adminUpdateRes)}`);
    }
    logger.info('✅ ADMIN successfully updated department 2');

    // 4. Duplicate Registration check (409 Conflict)
    logger.info('4. Testing duplicate registration rejection...');
    const dupRes = await request('POST', '/api/v1/auth/register', {
      name: 'Duplicate Ramesh',
      email: govEmail,
      password: 'AnotherPassword123!',
      role: 'GOVERNMENT'
    });
    if (dupRes.statusCode !== 409 || dupRes.body.success !== false) {
      throw new Error(`Duplicate check failed, expected 409: ${JSON.stringify(dupRes)}`);
    }
    logger.info('✅ Duplicate user properly rejected with 409 Conflict');

    // 5. Login Test with valid credentials
    logger.info('5. Testing login with valid credentials...');
    const loginRes = await request('POST', '/api/v1/auth/login', {
      email: govEmail,
      password: 'GovPassword123!'
    });
    if (loginRes.statusCode !== 200 || !loginRes.body.data.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }
    logger.info('✅ Login succeeded and returned valid JWT token');

    // 6. Login Test with invalid credentials
    logger.info('6. Testing login with wrong password...');
    const badLoginRes = await request('POST', '/api/v1/auth/login', {
      email: govEmail,
      password: 'WrongPassword!'
    });
    if (badLoginRes.statusCode !== 401) {
      throw new Error(`Bad login check failed, expected 401: ${JSON.stringify(badLoginRes)}`);
    }
    logger.info('✅ Invalid password correctly rejected with 401 Unauthorized');

    // 7. Verify /auth/me
    logger.info('7. Verifying /auth/me profile endpoint...');
    const meRes = await request('GET', '/api/v1/auth/me', null, govToken);
    if (meRes.statusCode !== 200 || meRes.body.data.user.email !== govEmail) {
      throw new Error(`Get /auth/me failed: ${JSON.stringify(meRes)}`);
    }
    logger.info('✅ /auth/me returned authentic user profile with department relation');

    // 8. RBAC Test: Non-admin accessing Admin endpoint (should be 403)
    logger.info('8. Testing RBAC restriction (Government user accessing Admin Dashboard)...');
    const rbacRes = await request('GET', '/api/v1/admin/dashboard', null, govToken);
    if (rbacRes.statusCode !== 403) {
      throw new Error(`RBAC check failed, expected 403: ${JSON.stringify(rbacRes)}`);
    }
    logger.info('✅ RBAC correctly blocked Government user from Admin dashboard with 403 Forbidden');

    // 9. Admin accessing Admin Dashboard (200 OK)
    logger.info('9. Admin accessing /admin/dashboard...');
    const adminDashRes = await request('GET', '/api/v1/admin/dashboard', null, adminToken);
    if (adminDashRes.statusCode !== 200 || !adminDashRes.body.data.summary) {
      throw new Error(`Admin dashboard failed: ${JSON.stringify(adminDashRes)}`);
    }
    logger.info(`✅ Admin dashboard loaded. Total users in DB: ${adminDashRes.body.data.summary.totalUsers}`);

    // 10. Admin updating user status
    logger.info('10. Admin updating user status...');
    const statusRes = await request('PATCH', `/api/v1/users/${govUser.id}/status`, {
      is_active: false
    }, adminToken);
    if (statusRes.statusCode !== 200 || statusRes.body.data.user.is_active !== false) {
      throw new Error(`Status update failed: ${JSON.stringify(statusRes)}`);
    }
    logger.info('✅ User deactivated by Admin');

    // 11. Deactivated user attempting login should be 401 Unauthorized
    logger.info('11. Deactivated user attempting login...');
    const deactLoginRes = await request('POST', '/api/v1/auth/login', {
      email: govEmail,
      password: 'GovPassword123!'
    });
    if (deactLoginRes.statusCode !== 401 && deactLoginRes.statusCode !== 403) {
      throw new Error(`Deactivated user login expected 401 or 403, got: ${JSON.stringify(deactLoginRes)}`);
    }
    logger.info('✅ Deactivated user successfully blocked from login with 401 Unauthorized');

    // 12. Reactivate user
    logger.info('12. Reactivating user...');
    await request('PATCH', `/api/v1/users/${govUser.id}/status`, { is_active: true }, adminToken);
    logger.info('✅ User reactivated');

    // 13. Audit Logs Verification
    logger.info('13. Admin checking /audit-logs...');
    const auditRes = await request('GET', '/api/v1/audit-logs', null, adminToken);
    if (auditRes.statusCode !== 200 || !Array.isArray(auditRes.body.data.logs)) {
      throw new Error(`Audit logs failed: ${JSON.stringify(auditRes)}`);
    }
    logger.info(`✅ Audit logs retrieved (${auditRes.body.data.logs.length} entries). Latest action: ${auditRes.body.data.logs[0]?.action}`);

    logger.info('🎉 All Phase 2 Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Phase 2 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runPhase2Tests();
