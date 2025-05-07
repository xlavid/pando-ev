"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
// import rateLimit from 'express-rate-limit'; // Rate limiting disabled for testing
const chargerController_1 = require("./controllers/chargerController");
const partnerController_1 = require("./controllers/partnerController");
const auth_1 = require("./middlewares/auth");
const logger_1 = __importDefault(require("./utils/logger"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Rate limiting disabled for load testing
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);
logger_1.default.info('*** Running with rate limiting DISABLED - for testing only ***');
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        rateLimit: 'disabled'
    });
});
// Initialize controllers
const chargerController = new chargerController_1.ChargerController();
const partnerController = new partnerController_1.PartnerController();
// Public admin routes (no auth)
app.post('/api/v1/partners', (req, res) => partnerController.createPartner(req, res));
app.get('/api/v1/partners', (req, res) => partnerController.listPartners(req, res));
app.get('/api/v1/partners/:partnerId', (req, res) => partnerController.getPartner(req, res));
// Protected routes (require API key)
app.use('/api/v1/chargers', auth_1.apiKeyAuth);
app.post('/api/v1/chargers', (req, res) => chargerController.initializeCharger(req, res));
app.get('/api/v1/chargers/:chargerId', (req, res) => chargerController.getStatus(req, res));
app.put('/api/v1/chargers/:chargerId/status', (req, res) => chargerController.updateStatus(req, res));
app.get('/api/v1/partners/:partnerId/chargers', auth_1.apiKeyAuth, (req, res) => chargerController.getPartnerChargers(req, res));
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
app.listen(port, () => {
    logger_1.default.info(`Server is running on port ${port} (RATE LIMITING DISABLED)`);
});
//# sourceMappingURL=index-no-rate-limit.js.map