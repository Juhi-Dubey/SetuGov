import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runHealthTests = async () => {
  logger.info('🧪 Starting Phase 1 Health & Setup Verification Tests...');

  // 1. Test Database connection
  try {
    logger.info('Checking PostgreSQL connection via Prisma...');
    const result = await prisma.$queryRaw`SELECT 1 as connected, version() as pg_version;`;
    logger.info('✅ PostgreSQL Connected Successfully:', result);
  } catch (error) {
    logger.error('❌ PostgreSQL Connection Failed:', error);
    process.exit(1);
  }

  // 2. Test Express App Endpoints
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const makeRequest = (urlPath) => {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${urlPath}`, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: JSON.parse(body)
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: body
            });
          }
        });
      }).on('error', reject);
    });
  };

  try {
    // Test GET /
    logger.info('Testing GET /...');
    const rootRes = await makeRequest('/');
    if (rootRes.statusCode !== 200 || !rootRes.data.success) {
      throw new Error(`Root test failed: ${JSON.stringify(rootRes)}`);
    }
    logger.info('✅ Root endpoint passed');

    // Test GET /api/v1
    logger.info('Testing GET /api/v1...');
    const v1Res = await makeRequest('/api/v1');
    if (v1Res.statusCode !== 200 || !v1Res.data.success) {
      throw new Error(`API v1 test failed: ${JSON.stringify(v1Res)}`);
    }
    logger.info('✅ API v1 root endpoint passed');

    // Test GET /api/v1/health
    logger.info('Testing GET /api/v1/health...');
    const healthRes = await makeRequest('/api/v1/health');
    if (healthRes.statusCode !== 200 || !healthRes.data.success || healthRes.data.data.database.status !== 'connected') {
      throw new Error(`Health test failed: ${JSON.stringify(healthRes)}`);
    }
    logger.info('✅ Health check endpoint passed:', JSON.stringify(healthRes.data, null, 2));

    // Test 404 handler
    logger.info('Testing 404 handler on /api/v1/non-existent-route...');
    const notFoundRes = await makeRequest('/api/v1/non-existent-route');
    if (notFoundRes.statusCode !== 404 || notFoundRes.data.success !== false || notFoundRes.data.error.code !== 'NOT_FOUND') {
      throw new Error(`404 test failed: ${JSON.stringify(notFoundRes)}`);
    }
    logger.info('✅ 404 Error handler passed:', JSON.stringify(notFoundRes.data));

    logger.info('🎉 All Phase 1 Verification Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Phase 1 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runHealthTests();
