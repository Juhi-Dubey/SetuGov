import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  govt1: {
    email: process.env.GOVT1_EMAIL || 'govt1@setugov.in',
    password: process.env.GOVT1_PASSWORD || '',
  },
  govt2: {
    email: process.env.GOVT2_EMAIL || 'govt2@setugov.in',
    password: process.env.GOVT2_PASSWORD || '',
  },
  startup1: {
    email: process.env.STARTUP1_EMAIL || 'startup1@setugov.in',
    password: process.env.STARTUP1_PASSWORD || '',
  },
  startup2: {
    email: process.env.STARTUP2_EMAIL || 'startup2@setugov.in',
    password: process.env.STARTUP2_PASSWORD || '',
  },
  startup3: {
    email: process.env.STARTUP3_EMAIL || 'startup3@setugov.in',
    password: process.env.STARTUP3_PASSWORD || '',
  },
  evaluator1: {
    email: process.env.EVALUATOR1_EMAIL || 'evaluator1@setugov.in',
    password: process.env.EVALUATOR1_PASSWORD || '',
  },
  evaluator2: {
    email: process.env.EVALUATOR2_EMAIL || 'evaluator2@setugov.in',
    password: process.env.EVALUATOR2_PASSWORD || '',
  },
};
