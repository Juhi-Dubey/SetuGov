import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_MOCK_MODE: (() => {
    const val = process.env.AI_MOCK_MODE;
    if (val === undefined || val === '') return true;
    if (val === 'true') return true;
    if (val === 'false') return false;
    throw new Error(`Invalid AI_MOCK_MODE value: "${val}". Must be "true", "false", or unset.`);
  })(),
  NODE_ENV: nodeEnv,
  OLLAMA_BASE_URL: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, ''),
  OLLAMA_EMBEDDING_MODEL: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
  OLLAMA_EMBEDDING_DIMENSION: parseInt(process.env.OLLAMA_EMBEDDING_DIMENSION || '768', 10),
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
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'console',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@setugov.gov.in',
  EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  INVITATION_EXPIRY_HOURS: parseInt(process.env.INVITATION_EXPIRY_HOURS || '48', 10)
};

export default config;

