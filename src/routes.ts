import express from 'express';
import { apiKeyAuth, adminKeyAuth } from './middlewares/auth';
import { ChargerController } from './controllers/chargerController';
import { PartnerController } from './controllers/partnerController';
import logger from './utils/logger';

const router = express.Router();
const chargerController = new ChargerController();
const partnerController = new PartnerController();

// Utility function to handle async route handlers
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Protected partner routes (all require admin auth)
router.post('/partners', adminKeyAuth, asyncHandler(partnerController.createPartner.bind(partnerController)));
router.get('/partners', adminKeyAuth, asyncHandler(partnerController.listPartners.bind(partnerController)));
router.get('/partners/:partnerId', adminKeyAuth, asyncHandler(partnerController.getPartner.bind(partnerController)));

// Charger routes (require partner auth)
router.use('/chargers', apiKeyAuth);
router.post('/chargers', asyncHandler(chargerController.initializeCharger.bind(chargerController)));
router.get('/chargers/:chargerId', asyncHandler(chargerController.getStatus.bind(chargerController)));
router.put('/chargers/:chargerId/status', asyncHandler(chargerController.updateStatus.bind(chargerController)));

// Partner's chargers routes (requires auth)
router.use('/partners/:partnerId/chargers', apiKeyAuth);
router.get('/partners/:partnerId/chargers', asyncHandler(chargerController.getPartnerChargers.bind(chargerController)));

// Log available routes
logger.info('API Routes initialized: partners, chargers');

export default router; 