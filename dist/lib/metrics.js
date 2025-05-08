"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMetrics = exports.getMetrics = exports.updateDbConnectionStats = exports.trackChargerEvent = exports.metricsMiddleware = exports.trackRedisOperation = exports.updateCacheStats = void 0;
const prom_client_1 = require("prom-client");
const logger_1 = __importDefault(require("../utils/logger"));
// Create a Registry to register the metrics
const register = new prom_client_1.Registry();
// Enable the collection of default metrics
(0, prom_client_1.collectDefaultMetrics)({ register });
// Define custom metrics
const httpRequestDurationMicroseconds = new prom_client_1.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
});
const httpRequestsTotal = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});
const chargerEventsTotal = new prom_client_1.Counter({
    name: 'charger_events_total',
    help: 'Total number of charger events',
    labelNames: ['event_type', 'partner_id']
});
const concurrentConnections = new prom_client_1.Gauge({
    name: 'concurrent_connections',
    help: 'Number of concurrent connections'
});
const cacheHitRatio = new prom_client_1.Gauge({
    name: 'cache_hit_ratio',
    help: 'Ratio of cache hits to total cache attempts',
    labelNames: ['cache_type']
});
const databaseConnectionPoolSize = new prom_client_1.Gauge({
    name: 'database_connection_pool_size',
    help: 'Size of the database connection pool',
    labelNames: ['state']
});
const redisOperationsTotal = new prom_client_1.Counter({
    name: 'redis_operations_total',
    help: 'Total number of Redis operations',
    labelNames: ['operation', 'status']
});
// Register the metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(chargerEventsTotal);
register.registerMetric(concurrentConnections);
register.registerMetric(cacheHitRatio);
register.registerMetric(databaseConnectionPoolSize);
register.registerMetric(redisOperationsTotal);
// Track cache statistics
let cacheHits = 0;
let cacheMisses = 0;
const updateCacheStats = (hit, cacheType = 'redis') => {
    if (hit) {
        cacheHits++;
    }
    else {
        cacheMisses++;
    }
    // Update the gauge
    const ratio = cacheHits / (cacheHits + cacheMisses);
    cacheHitRatio.set({ cache_type: cacheType }, ratio);
};
exports.updateCacheStats = updateCacheStats;
const trackRedisOperation = (operation, success) => {
    const status = success ? 'success' : 'error';
    redisOperationsTotal.inc({ operation, status });
};
exports.trackRedisOperation = trackRedisOperation;
// Middleware to measure request duration
const metricsMiddleware = (req, res, next) => {
    // Increase concurrent connections
    concurrentConnections.inc();
    // Start the timer
    const start = Date.now();
    // The following function will be called when the request is finished
    res.on('finish', () => {
        // Decrease concurrent connections
        concurrentConnections.dec();
        // Calculate request duration
        const duration = Date.now() - start;
        // Clean route by removing IDs
        let route = req.path
            .replace(/\/api\/v\d+/, '') // Remove API version
            .replace(/\/[0-9a-fA-F-]{36,}/g, '/:id') // Replace UUIDs with :id
            .replace(/\/\d+/g, '/:id'); // Replace numeric IDs with :id
        // If route is still dynamic or empty, use a default
        if (!route || route === '/') {
            route = req.baseUrl || '/';
        }
        // Record metrics
        httpRequestDurationMicroseconds.observe({ method: req.method, route, status_code: res.statusCode }, duration);
        httpRequestsTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode
        });
        // Log for debugging
        if (duration > 1000) {
            logger_1.default.debug(`Slow request: ${req.method} ${req.path} took ${duration}ms with status ${res.statusCode}`);
        }
    });
    next();
};
exports.metricsMiddleware = metricsMiddleware;
// Track charger events
const trackChargerEvent = (eventType, partnerId) => {
    chargerEventsTotal.inc({ event_type: eventType, partner_id: partnerId });
};
exports.trackChargerEvent = trackChargerEvent;
// Update database connection pool stats
const updateDbConnectionStats = (active, idle, waiting) => {
    databaseConnectionPoolSize.set({ state: 'active' }, active);
    databaseConnectionPoolSize.set({ state: 'idle' }, idle);
    databaseConnectionPoolSize.set({ state: 'waiting' }, waiting);
};
exports.updateDbConnectionStats = updateDbConnectionStats;
// Expose the metrics for Prometheus
const getMetrics = async () => {
    return register.metrics();
};
exports.getMetrics = getMetrics;
// Reset metrics (useful for testing)
const resetMetrics = () => {
    register.resetMetrics();
    cacheHits = 0;
    cacheMisses = 0;
};
exports.resetMetrics = resetMetrics;
exports.default = {
    metricsMiddleware: exports.metricsMiddleware,
    updateCacheStats: exports.updateCacheStats,
    trackRedisOperation: exports.trackRedisOperation,
    trackChargerEvent: exports.trackChargerEvent,
    updateDbConnectionStats: exports.updateDbConnectionStats,
    getMetrics: exports.getMetrics,
    resetMetrics: exports.resetMetrics
};
//# sourceMappingURL=metrics.js.map