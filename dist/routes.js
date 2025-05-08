"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("./middlewares/auth");
const chargerController_1 = require("./controllers/chargerController");
const partnerController_1 = require("./controllers/partnerController");
const logger_1 = __importDefault(require("./utils/logger"));
const router = express_1.default.Router();
const chargerController = new chargerController_1.ChargerController();
const partnerController = new partnerController_1.PartnerController();
// Utility function to handle async route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Partner routes (no auth)
router.post('/partners', asyncHandler(partnerController.createPartner.bind(partnerController)));
router.get('/partners', asyncHandler(partnerController.listPartners.bind(partnerController)));
router.get('/partners/:partnerId', asyncHandler(partnerController.getPartner.bind(partnerController)));
// Charger routes (require auth)
router.use('/chargers', auth_1.apiKeyAuth);
router.post('/chargers', asyncHandler(chargerController.initializeCharger.bind(chargerController)));
router.get('/chargers/:chargerId', asyncHandler(chargerController.getStatus.bind(chargerController)));
router.put('/chargers/:chargerId/status', asyncHandler(chargerController.updateStatus.bind(chargerController)));
// Partner's chargers routes (requires auth)
router.use('/partners/:partnerId/chargers', auth_1.apiKeyAuth);
router.get('/partners/:partnerId/chargers', asyncHandler(chargerController.getPartnerChargers.bind(chargerController)));
// Log available routes
logger_1.default.info('API Routes initialized: partners, chargers');
exports.default = router;
//# sourceMappingURL=routes.js.map