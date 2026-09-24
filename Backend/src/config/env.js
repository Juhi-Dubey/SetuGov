import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

// Load .env from backend root (reliably resolved relative to this module)
const backendEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

// Also check process.cwd() .env if different
const cwdEnvPath = path.resolve(process.cwd(), '.env');
if (cwdEnvPath !== backendEnvPath && fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath, override: true });
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'development' || nodeEnv === 'test' ? 'setugov_super_secret_jwt_key_2026' : undefined);

if (!jwtSecret && nodeEnv === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable must be set in production.');
}

export const config = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BANK_ENCRYPTION_KEY: process.env.BANK_ENCRYPTION_KEY || '',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_MOCK_MODE: (() => {
    const val = process.env.AI_MOCK_MODE;
    if (val === undefined || val === '') return false;
    if (val === 'true') return true;
    if (val === 'false') return false;
    throw new Error(`Invalid AI_MOCK_MODE value: "${val}". Must be "true", "false", or unset.`);
  })(),
  NODE_ENV: nodeEnv,
  AI_TIMEOUT: parseInt(process.env.AI_TIMEOUT || '300', 10),
  AI_EMBEDDING_DIMENSION: parseInt(process.env.AI_EMBEDDING_DIMENSION || '768', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '15', 10), // 15 attempts / 15 mins
  INVITATION_RATE_LIMIT_WINDOW_MS: parseInt(process.env.INVITATION_RATE_LIMIT_WINDOW_MS || '900000', 10),
  INVITATION_RATE_LIMIT_MAX: parseInt(process.env.INVITATION_RATE_LIMIT_MAX || '20', 10),
  ACCESS_REQUEST_RATE_LIMIT_WINDOW_MS: parseInt(process.env.ACCESS_REQUEST_RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 hour
  ACCESS_REQUEST_RATE_LIMIT_MAX: parseInt(process.env.ACCESS_REQUEST_RATE_LIMIT_MAX || '5', 10),
  TURNSTILE_ENABLED: process.env.TURNSTILE_ENABLED === 'true',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
  TURNSTILE_EXPECTED_HOSTNAME: process.env.TURNSTILE_EXPECTED_HOSTNAME || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'console',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@setugov.gov.in',
  EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',
  ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '',
  EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  EMAIL_SMTP_PORT: parseInt(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '465', 10),
  EMAIL_SMTP_SECURE: process.env.EMAIL_SMTP_SECURE !== undefined
    ? process.env.EMAIL_SMTP_SECURE === 'true'
    : (process.env.SMTP_SECURE === 'true' || parseInt(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '465', 10) === 465),
  EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER || process.env.SMTP_USER || '',
  EMAIL_SMTP_PASSWORD: process.env.EMAIL_SMTP_PASSWORD || process.env.SMTP_PASS || '',
  SMTP_HOST: process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '465', 10),
  SMTP_USER: process.env.EMAIL_SMTP_USER || process.env.SMTP_USER || '',
  SMTP_PASS: process.env.EMAIL_SMTP_PASSWORD || process.env.SMTP_PASS || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  INVITATION_EXPIRY_HOURS: parseInt(process.env.INVITATION_EXPIRY_HOURS || '48', 10)
};

export default config;

