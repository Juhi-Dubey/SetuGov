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

export const getAiHealth = async (req, res, next) => {
  const startTime = Date.now();
  const mockMode = config.AI_MOCK_MODE;
  const serviceUrl = config.AI_SERVICE_URL;

  if (mockMode) {
    return successResponse(
      res,
      {
        status: 'mock',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        service: 'SetuGov AI Integration',
        aiService: {
          status: 'mock_mode',
          serviceUrl,
          message: 'Backend is operating in deterministic heuristic mock mode'
        }
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
      return errorResponse(
        res,
        'AI_SERVICE_UNHEALTHY',
        `AI service returned HTTP ${response.status}`,
        {
          mode: 'live',
          serviceUrl,
          latencyMs,
          httpStatus: response.status
        },
        503
      );
    }

    const aiData = await response.json();
    return successResponse(
      res,
      {
        status: 'healthy',
        mode: 'live',
        timestamp: new Date().toISOString(),
        service: 'SetuGov AI Integration',
        aiService: {
          status: 'connected',
          serviceUrl,
          latencyMs,
          details: aiData
        }
      },
      'AI service is connected and healthy'
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return errorResponse(
      res,
      'AI_SERVICE_UNAVAILABLE',
      'Unable to connect to Python AI service',
      {
        mode: 'live',
        serviceUrl,
        latencyMs,
        error: error.name === 'AbortError' ? 'Connection timed out (5s)' : error.message
      },
      503
    );
  }
};