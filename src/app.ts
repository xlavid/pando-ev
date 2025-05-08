import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import logger from './utils/logger';
import morgan from 'morgan';

// Create Express app
const app = express();

// Set server timeouts to prevent hanging connections
app.set('timeout', 30000); // 30 second timeout (reduced from 120s)
app.set('keepAliveTimeout', 30000); // 30 seconds keep-alive (reduced from 65s)
app.set('headersTimeout', 25000); // 25 seconds headers timeout (reduced from 60s)

// Security middleware
app.use(helmet());

// Rate limiting (enabled for production)
/* 
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
  logger.info('Rate limiting enabled in production mode');
}
*/
// Rate limiting disabled
logger.info('Rate limiting has been disabled');

// Increase payload limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging middleware - use combined format for production, dev for development
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req) => req.path === '/health' // Skip logging health checks
}));

// Create a request ID for each request
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substring(2, 15);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Add request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  // Skip logging for health checks
  if (req.path !== '/health') {
    // Log request
    logger.debug(`[${req.id}] ${req.method} ${req.path} started`);
  }
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Skip health check logging and only log errors or slow requests
    if (req.path !== '/health' || res.statusCode >= 400 || duration > 1000) {
      const level = res.statusCode >= 400 ? 'error' : 'info';
      logger[level](`[${req.id}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  
  // Handle unexpected errors
  res.on('error', (err) => {
    const duration = Date.now() - start;
    logger.error(`[${req.id}] ${req.method} ${req.path} error after ${duration}ms:`, err);
  });
  
  next();
});

// Add request timeout handler
app.use((req, res, next) => {
  // Skip health checks
  if (req.path === '/health') {
    return next();
  }

  // Set timeout for requests
  req.setTimeout(30000, () => {
    logger.warn(`[${req.id}] Request timeout: ${req.method} ${req.path}`);
    // If headers haven't been sent yet, send a timeout response
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timeout, server is under heavy load' });
    }
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/v1', routes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Add custom request ID type to Express Request
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export default app; 