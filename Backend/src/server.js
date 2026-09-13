import { createApp } from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './utils/logger.js';

const app = createApp();
const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info(`================================================`);
  logger.info(`🚀 SetuGov Backend Server running on port ${PORT}`);
  logger.info(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
  logger.info(`🩺 Health Check: http://localhost:${PORT}/api/v1/health`);
  logger.info(`⚙️  Environment: ${config.NODE_ENV}`);
  logger.info(`🤖 AI Mock Mode: ${config.AI_MOCK_MODE ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`================================================`);
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnect:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10s if graceful fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
