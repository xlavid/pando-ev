import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Connection pool configuration
const connectionPoolConfig = {
  max: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '20', 10),
  timeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '15', 10) * 1000,
};

// Prisma Client with connection pooling and enhanced logging
const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Log database warnings
prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

// Add middleware for connection error handling and retries
prisma.$use(async (params, next) => {
  const MAX_RETRIES = 3;
  let retries = 0;
  let result;

  while (retries < MAX_RETRIES) {
    try {
      // Attempt query execution
      result = await next(params);
      return result;
    } catch (error: any) {
      retries++;
      
      // Log connection errors with retry information
      if (retries < MAX_RETRIES) {
        logger.warn(`Database operation failed (attempt ${retries}/${MAX_RETRIES}): ${params.model}.${params.action}`, {
          error: error.message,
          code: error.code
        });
        
        // Wait with exponential backoff before retrying
        const delay = 100 * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Final attempt failed, log as error
        logger.error(`Database operation failed after ${MAX_RETRIES} attempts: ${params.model}.${params.action}`, {
          error: error.message,
          code: error.code,
          modelName: params.model,
          action: params.action
        });
        throw error;
      }
    }
  }
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down Prisma client...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down Prisma client...');
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma; 