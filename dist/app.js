"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./utils/logger"));
const morgan_1 = __importDefault(require("morgan"));
// Create Express app
const app = (0, express_1.default)();
// Set server timeouts to prevent hanging connections
app.set('timeout', 30000); // 30 second timeout (reduced from 120s)
app.set('keepAliveTimeout', 30000); // 30 seconds keep-alive (reduced from 65s)
app.set('headersTimeout', 25000); // 25 seconds headers timeout (reduced from 60s)
// Security middleware
app.use((0, helmet_1.default)());
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
logger_1.default.info('Rate limiting has been disabled');
// Increase payload limits
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Logging middleware - use combined format for production, dev for development
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
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
        logger_1.default.debug(`[${req.id}] ${req.method} ${req.path} started`);
    }
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        // Skip health check logging and only log errors or slow requests
        if (req.path !== '/health' || res.statusCode >= 400 || duration > 1000) {
            const level = res.statusCode >= 400 ? 'error' : 'info';
            logger_1.default[level](`[${req.id}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
        }
    });
    // Handle unexpected errors
    res.on('error', (err) => {
        const duration = Date.now() - start;
        logger_1.default.error(`[${req.id}] ${req.method} ${req.path} error after ${duration}ms:`, err);
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
        logger_1.default.warn(`[${req.id}] Request timeout: ${req.method} ${req.path}`);
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
app.use('/api/v1', routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.default.error(`Unhandled error: ${err.message}`, err);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
exports.default = app;
//# sourceMappingURL=app.js.map