import { prisma } from '../config/prisma.js';
import { logger } from './logger.js';

let keepAliveInterval = null;

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

  // Periodic keep-alive ping (every 3 minutes) to prevent serverless Neon instances
  // from auto-suspending and closing idle TCP connections while backend is running
  if (!keepAliveInterval && process.env.NODE_ENV !== 'test') {
    keepAliveInterval = setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        logger.debug?.(`[KEEPALIVE] Periodic database ping error: ${err?.message || err}`);
      }
    }, 3 * 60 * 1000);

    if (keepAliveInterval.unref) {
      keepAliveInterval.unref();
    }
  }
};

export default warmPrismaConnection;
