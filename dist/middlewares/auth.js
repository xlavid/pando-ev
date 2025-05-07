"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = void 0;
const partnerService_1 = require("../services/partnerService");
const logger_1 = __importDefault(require("../utils/logger"));
const partnerService = new partnerService_1.PartnerService();
// Add a simple in-memory cache for API keys
// This will significantly reduce database lookups for the same API key
const apiKeyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
// Clean expired cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of apiKeyCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            apiKeyCache.delete(key);
        }
    }
}, 60 * 1000); // Clean every minute
const apiKeyAuth = async (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }
    try {
        // Check cache first
        const cachedPartner = apiKeyCache.get(apiKey);
        if (cachedPartner) {
            // Use cached partner information
            req.partner = {
                id: cachedPartner.id,
                name: cachedPartner.name
            };
            return next();
        }
        // Cache miss, fetch from database
        const partner = await partnerService.getPartnerByApiKey(apiKey);
        // Add to cache
        apiKeyCache.set(apiKey, {
            id: partner.id,
            name: partner.name,
            timestamp: Date.now()
        });
        // Attach partner information to the request for use in controllers
        req.partner = {
            id: partner.id,
            name: partner.name
        };
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid API key' });
    }
};
exports.apiKeyAuth = apiKeyAuth;
//# sourceMappingURL=auth.js.map