import { prisma } from '../config/prisma.js';
import { logger } from './logger.js';

/**
 * Pre-warm the database connection to prevent cold-start latency
 * on serverless PostgreSQL (e.g. Neon) from timing out the first
 * interactive API call or transaction.
 */
export const warmPrismaConnection = async () => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info(`[WARMUP] Database connection pre-warmed successfully in ${Date.now() - start}ms`);
  } catch (err) {
    logger.warn(`[WARMUP] Database pre-warm failed (${Date.now() - start}ms): ${err?.message || err}`);
  }
};

export default warmPrismaConnection;
