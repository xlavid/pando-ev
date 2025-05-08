"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnection = exports.RedisCache = void 0;
const redis_1 = require("redis");
const logger_1 = __importDefault(require("../utils/logger"));
// Global Redis client for the application
let redisClient = null;
// Initialize the Redis client
const initRedisClient = async () => {
    if (redisClient) {
        return redisClient;
    }
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const newClient = (0, redis_1.createClient)({
        url,
        socket: {
            reconnectStrategy: (retries) => {
                // Exponential backoff with max of 10 seconds
                const delay = Math.min(Math.pow(2, retries) * 100, 10000);
                logger_1.default.info(`Redis reconnect attempt ${retries}, delaying by ${delay}ms`);
                return delay;
            },
            connectTimeout: 5000,
        },
    });
    // Set up event handlers
    newClient.on('error', (err) => {
        logger_1.default.error('Redis client error:', err);
    });
    newClient.on('reconnecting', () => {
        logger_1.default.info('Redis client reconnecting');
    });
    newClient.on('connect', () => {
        logger_1.default.info('Redis client connected');
    });
    await newClient.connect();
    redisClient = newClient;
    return newClient;
};
/**
 * Redis-based distributed cache implementation
 *
 * Provides a way to cache data across multiple API instances
 * using Redis as the backing store
 */
class RedisCache {
    /**
     * Create a new Redis cache
     *
     * @param prefix The prefix to use for cache keys
     * @param defaultTtlSeconds Default TTL in seconds
     */
    constructor(prefix, defaultTtlSeconds = 60) {
        this.prefix = prefix;
        this.defaultTtl = defaultTtlSeconds;
    }
    /**
     * Get the full key with prefix
     */
    getKey(key) {
        return `${this.prefix}:${key}`;
    }
    /**
     * Get a value from the cache
     *
     * @param key Cache key
     * @returns The cached value or undefined if not found
     */
    async get(key) {
        try {
            const client = await initRedisClient();
            const data = await client.get(this.getKey(key));
            if (!data) {
                return undefined;
            }
            return JSON.parse(data);
        }
        catch (error) {
            logger_1.default.error(`Redis cache get error for key ${key}:`, error);
            return undefined;
        }
    }
    /**
     * Set a value in the cache
     *
     * @param key Cache key
     * @param value Value to cache
     * @param ttlSeconds Optional TTL in seconds (defaults to constructor value)
     */
    async set(key, value, ttlSeconds) {
        try {
            const client = await initRedisClient();
            const ttl = ttlSeconds ?? this.defaultTtl;
            // Store as JSON string
            await client.set(this.getKey(key), JSON.stringify(value), { EX: ttl });
        }
        catch (error) {
            logger_1.default.error(`Redis cache set error for key ${key}:`, error);
        }
    }
    /**
     * Delete a value from the cache
     *
     * @param key Cache key to delete
     */
    async delete(key) {
        try {
            const client = await initRedisClient();
            await client.del(this.getKey(key));
        }
        catch (error) {
            logger_1.default.error(`Redis cache delete error for key ${key}:`, error);
        }
    }
    /**
     * Clear all keys with this prefix
     */
    async clear() {
        try {
            const client = await initRedisClient();
            const keys = await client.keys(`${this.prefix}:*`);
            if (keys.length > 0) {
                await client.del(keys);
            }
        }
        catch (error) {
            logger_1.default.error(`Redis cache clear error:`, error);
        }
    }
}
exports.RedisCache = RedisCache;
// Graceful shutdown to properly close Redis connections
const closeRedisConnection = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.default.info('Redis connection closed');
    }
};
exports.closeRedisConnection = closeRedisConnection;
//# sourceMappingURL=redisCache.js.map