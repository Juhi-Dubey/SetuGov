import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { NotFoundError } from './utils/errors.js';
import { logger } from './utils/logger.js';
import { config } from './config/env.js';

export const createApp = () => {
  const app = express();

  // Security Headers with Cross-Origin Resource Policy for uploads
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // Ensure uploads directory exists and mount static serving
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // CORS Configuration (P1-7: Restrict origins)
  const allowedOrigins = config.CORS_ORIGIN === '*'
    ? '*'
    : config.CORS_ORIGIN.split(',').map(s => s.trim());

  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // General API Rate Limiting (P2-2)
  app.use('/api/v1', apiRateLimiter);

  // HTTP Request Logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http(req.method, req.originalUrl, res.statusCode, duration);
    });
    next();
  });

  // Welcome Route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      service: 'SetuGov API Gateway',
      status: 'operational',
      apiPrefix: '/api/v1',
      healthCheck: '/api/v1/health'
    });
  });

  // Mount API v1 Routes
  app.use('/api/v1', apiRouter);

  // 404 Not Found Handler
  app.use((req, res, next) => {
    next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
