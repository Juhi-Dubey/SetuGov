import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';
import { getAiHealth } from '../controllers/healthController.js';

const runHealthTests = async () => {
  logger.info('🧪 Starting Phase 1 & Phase 3 Health Verification Tests...');

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
    if (healthRes.statusCode !== 200 || !healthRes.data.success || healthRes.data.data?.database?.status !== 'connected') {
      throw new Error(`Health test failed: ${JSON.stringify(healthRes)}`);
    }
    logger.info('✅ Health check endpoint passed:', JSON.stringify(healthRes.data, null, 2));

    // Test GET /api/v1/health/ai (Phase 3 Health & AI Dependency Probing in Mock Mode)
    logger.info('Testing GET /api/v1/health/ai (Mock mode)...');
    const healthAiRes = await makeRequest('/api/v1/health/ai');
    if (healthAiRes.statusCode !== 200 || !healthAiRes.data.success || healthAiRes.data.data?.mode !== 'mock') {
      throw new Error(`AI Health test failed: ${JSON.stringify(healthAiRes)}`);
    }
    logger.info('✅ AI Health check (mock mode) passed:', JSON.stringify(healthAiRes.data, null, 2));

    // 3. Unit test getAiHealth in Live Mode branches
    logger.info('Testing getAiHealth controller across Live Mode scenarios...');
    const originalFetch = global.fetch;
    const originalMockMode = config.AI_MOCK_MODE;

    // Helper for mock response objects
    const createMockRes = () => {
      const res = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.body = payload;
          return this;
        }
      };
      return res;
    };

    try {
      config.AI_MOCK_MODE = false;

      // Scenario A: Live AI service healthy
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', service: 'setugov-ai', version: '1.0.0' })
      });

      const mockResA = createMockRes();
      await getAiHealth({}, mockResA);
      if (mockResA.statusCode !== 200 || mockResA.body?.data?.status !== 'healthy' || mockResA.body?.data?.mode !== 'live') {
        throw new Error(`Live AI healthy check failed: ${JSON.stringify(mockResA.body)}`);
      }
      logger.info('✅ getAiHealth Live Connected test passed');

      // Scenario B: Live AI service returns HTTP 500
      global.fetch = async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      });

      const mockResB = createMockRes();
      await getAiHealth({}, mockResB);
      if (mockResB.statusCode !== 503 || mockResB.body?.error?.code !== 'AI_SERVICE_UNHEALTHY') {
        throw new Error(`Live AI 500 handling failed: ${JSON.stringify(mockResB.body)}`);
      }
      logger.info('✅ getAiHealth Live HTTP 500 handling test passed');

      // Scenario C: Live AI service connection refused / network failure
      global.fetch = async () => {
        throw new Error('fetch failed (ECONNREFUSED)');
      };

      const mockResC = createMockRes();
      await getAiHealth({}, mockResC);
      if (mockResC.statusCode !== 503 || mockResC.body?.error?.code !== 'AI_SERVICE_UNAVAILABLE') {
        throw new Error(`Live AI network failure handling failed: ${JSON.stringify(mockResC.body)}`);
      }
      logger.info('✅ getAiHealth Live Network Error / 503 handling test passed');
    } finally {
      global.fetch = originalFetch;
      config.AI_MOCK_MODE = originalMockMode;
    }

    // Test 404 handler
    logger.info('Testing 404 handler on /api/v1/non-existent-route...');
    const notFoundRes = await makeRequest('/api/v1/non-existent-route');
    if (notFoundRes.statusCode !== 404 || notFoundRes.data.success !== false || notFoundRes.data.error.code !== 'NOT_FOUND') {
      throw new Error(`404 test failed: ${JSON.stringify(notFoundRes)}`);
    }
    logger.info('✅ 404 Error handler passed:', JSON.stringify(notFoundRes.data));

    logger.info('🎉 All Health Verification Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Health Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runHealthTests();
