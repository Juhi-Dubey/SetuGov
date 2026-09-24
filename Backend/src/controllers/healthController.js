import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const getHealth = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'SetuGov Backend API',
      version: '1.0.0',
      uptime: process.uptime(),
      // environment: config.NODE_ENV,
      database: {
        status: 'connected',
        type: 'PostgreSQL',
        latencyMs: dbLatencyMs
      },
      // aiIntegration: {
      //   mockMode: config.AI_MOCK_MODE,
      //   serviceUrl: config.AI_SERVICE_URL
      // },
      // memory: process.memoryUsage()
    };

    return successResponse(res, healthData, 'System is healthy and operational');
  } catch (error) {
    logger.error(
      `[HEALTH] Database health check failed: ${error.message}`
    );

    return errorResponse(
      res,
      'SERVICE_UNHEALTHY',
      'Database or underlying service connectivity failed',
      null,
      503
    );
  }
};

export const getAiHealth = async (req, res, next) => {
  const startTime = Date.now();
  const mockMode = config.AI_MOCK_MODE;
  const serviceUrl = config.AI_SERVICE_URL;

  if (mockMode) {
    return successResponse(
      res,
      {
        status: 'mock',
        timestamp: new Date().toISOString(),
        service: 'SetuGov AI Integration'
      },
      'AI service is operating in mock mode'
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      logger.warn(`[AI HEALTH] AI service returned HTTP ${response.status} (${latencyMs}ms)`);
      return errorResponse(
        res,
        'AI_SERVICE_UNHEALTHY',
        'AI service is currently unavailable',
        null,
        503
      );
    }

    return successResponse(
      res,
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SetuGov AI Integration'
      },
      'AI service is connected and healthy'
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const reason = error.name === 'AbortError' ? 'Connection timed out (5s)' : error.message;
    logger.error(`[AI HEALTH] Failed to reach AI service (${latencyMs}ms): ${reason}`);
    return errorResponse(
      res,
      'AI_SERVICE_UNAVAILABLE',
      'AI service is currently unavailable',
      null,
      503
    );
  }
};