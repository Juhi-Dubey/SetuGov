import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import { logger } from './utils/logger.js';

export const createApp = () => {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
