import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/response.js';

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
      environment: config.NODE_ENV,
      database: {
        status: 'connected',
        type: 'PostgreSQL',
        latencyMs: dbLatencyMs
      },
      aiIntegration: {
        mockMode: config.AI_MOCK_MODE,
        serviceUrl: config.AI_SERVICE_URL
      },
      memory: process.memoryUsage()
    };

    return successResponse(res, healthData, 'System is healthy and operational');
  } catch (error) {
    return errorResponse(
      res,
      'SERVICE_UNHEALTHY',
      'Database or underlying service connectivity failed',
      { details: error.message },
      503
    );
  }
};
