"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = void 0;
const partnerService_1 = require("../services/partnerService");
const logger_1 = __importDefault(require("../utils/logger"));
const partnerService = new partnerService_1.PartnerService();
const apiKeyAuth = async (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }
    try {
        const partner = await partnerService.getPartnerByApiKey(apiKey);
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