import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/index.js';
import uploadRoutes from './routes/uploadRoutes.js';
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

  // Ensure private uploads directory exists (No public static mount - Phase 1 Security Hardening)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // CORS Configuration (P1-7: Restrict origins)
  const allowedOrigins = config.CORS_ORIGIN === '*'
    ? '*'
    : config.CORS_ORIGIN.split(',').map(s => s.trim());

  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Configure trust proxy for production reverse proxy / load balancers
  if (config.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Body Parsers (1MB limit for JSON; multipart uploads handled separately by multer)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

  // Direct uploads / documents route
  app.use('/uploads', uploadRoutes);
  app.use('/documents', uploadRoutes);

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
