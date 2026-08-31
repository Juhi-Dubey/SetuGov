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
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

export default config;
