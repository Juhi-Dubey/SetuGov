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

    // 1. Register Admin User
    logger.info('1. Registering Admin user...');
    const adminRegRes = await request('POST', '/api/v1/auth/register', {
      name: 'Admin Officer',
      email: `admin.${timestamp}@setugov.in`,
      password: 'SecureAdminPassword123!',
      role: 'ADMIN'
    });
    if (adminRegRes.statusCode !== 201 || !adminRegRes.body.success) {
      throw new Error(`Admin Register failed: ${JSON.stringify(adminRegRes)}`);
    }
    const adminToken = adminRegRes.body.data.token;
    const adminUser = adminRegRes.body.data.user;
    logger.info(`✅ Admin registered: ${adminUser.email}`);

    // 2. Admin creates a Department
    logger.info('2. Admin Creating Department...');
    const depRes = await request('POST', '/api/v1/departments', {
      name: `Department of Health & Family Welfare ${timestamp}`,
      state: 'Karnataka',
      contact_email: `health.${timestamp}@gov.in`
    }, adminToken);
    if (depRes.statusCode !== 201 || !depRes.body.success) {
      throw new Error(`Create Department failed: ${JSON.stringify(depRes)}`);
    }
    const department = depRes.body.data.department;
    logger.info(`✅ Department created: ${department.name} (${department.id})`);

    // 3. Register Government User with department
    logger.info('3. Registering Government user...');
    const govEmail = `ramesh.${timestamp}@health.gov.in`;
    const govRegRes = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Ramesh Kumar',
      email: govEmail,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: department.id
    });
    if (govRegRes.statusCode !== 201 || !govRegRes.body.success) {
      throw new Error(`Government Register failed: ${JSON.stringify(govRegRes)}`);
    }
    const govToken = govRegRes.body.data.token;
    const govUser = govRegRes.body.data.user;
    logger.info(`✅ Government user registered: ${govUser.email} for Dept: ${department.name}`);

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

    // 11. Deactivated user attempting login should be 403 Forbidden
    logger.info('11. Deactivated user attempting login...');
    const deactLoginRes = await request('POST', '/api/v1/auth/login', {
      email: govEmail,
      password: 'GovPassword123!'
    });
    if (deactLoginRes.statusCode !== 403) {
      throw new Error(`Deactivated user login expected 403, got: ${JSON.stringify(deactLoginRes)}`);
    }
    logger.info('✅ Deactivated user successfully blocked from login with 403 Forbidden');

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
