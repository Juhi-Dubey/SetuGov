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

  const isProduction = config.NODE_ENV === 'production';

  // Security Headers calibrated for SetuGov API Gateway
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      : false
  }));

  // Restrict sensitive browser feature permissions for API responses
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  // Ensure private uploads directory exists (No public static mount - Phase 1 Security Hardening)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Dynamic Environment-Aware CORS Configuration
  const resolveAllowedOrigins = () => {
    const origins = new Set();

    // Configured frontend URL from environment
    if (config.FRONTEND_URL) {
      origins.add(config.FRONTEND_URL.replace(/\/+$/, ''));
    }

    // Configured CORS_ORIGIN list from environment (if set and not wildcard)
    if (config.CORS_ORIGIN && config.CORS_ORIGIN !== '*') {
      config.CORS_ORIGIN.split(',').forEach((o) => {
        const trimmed = o.trim().replace(/\/+$/, '');
        if (trimmed) origins.add(trimmed);
      });
    }

    // Include local development origins in non-production environments
    if (!isProduction) {
      origins.add('http://localhost:5173');
      origins.add('http://127.0.0.1:5173');
      origins.add('http://localhost:3000');
      origins.add('http://127.0.0.1:3000');
    }

    return origins;
  };

  const allowedOriginsSet = resolveAllowedOrigins();

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, mobile native apps)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOriginsSet.has(normalizedOrigin)) {
        // Return explicit matched origin, never wildcard
        return callback(null, true);
      }

      // Reject unauthorized origins without sending permissive headers
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-bypass-rate-limit'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
    maxAge: 86400
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
      const sanitizedUrl = req.originalUrl.replace(/([?&](?:token|jwt|access_token|password|secret)=)[^&]+/gi, '$1[REDACTED]');
      logger.http(req.method, sanitizedUrl, res.statusCode, duration);
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
