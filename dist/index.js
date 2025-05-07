"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const chargerController_1 = require("./controllers/chargerController");
const partnerController_1 = require("./controllers/partnerController");
const auth_1 = require("./middlewares/auth");
const logger_1 = __importDefault(require("./utils/logger"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use((0, compression_1.default)()); // Add compression for all responses
// Cache middleware for GET requests
const cacheControl = (maxAge) => (req, res, next) => {
    if (req.method === 'GET') {
        res.set('Cache-Control', `public, max-age=${maxAge}`);
    }
    next();
};
// Health check endpoint with caching
app.get('/health', cacheControl(60), (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
// Initialize controllers
const chargerController = new chargerController_1.ChargerController();
const partnerController = new partnerController_1.PartnerController();
// Public admin routes (no auth)
app.post('/api/v1/partners', (req, res) => partnerController.createPartner(req, res));
app.get('/api/v1/partners', cacheControl(60), (req, res) => partnerController.listPartners(req, res));
app.get('/api/v1/partners/:partnerId', cacheControl(60), (req, res) => partnerController.getPartner(req, res));
// Protected routes (require API key)
app.use('/api/v1/chargers', auth_1.apiKeyAuth);
app.post('/api/v1/chargers', (req, res) => chargerController.initializeCharger(req, res));
app.get('/api/v1/chargers/:chargerId', cacheControl(5), (req, res) => chargerController.getStatus(req, res));
app.put('/api/v1/chargers/:chargerId/status', (req, res) => chargerController.updateStatus(req, res));
app.get('/api/v1/partners/:partnerId/chargers', auth_1.apiKeyAuth, cacheControl(5), (req, res) => chargerController.getPartnerChargers(req, res));
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
app.listen(port, () => {
    logger_1.default.info(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map