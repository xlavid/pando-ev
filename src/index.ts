import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ChargerController } from './controllers/chargerController';
import { PartnerController } from './controllers/partnerController';
import { apiKeyAuth } from './middlewares/auth';
import logger from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
// app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Initialize controllers
const chargerController = new ChargerController();
const partnerController = new PartnerController();

// Public admin routes (no auth)
app.post('/api/v1/partners', (req, res) => partnerController.createPartner(req, res));
app.get('/api/v1/partners', (req, res) => partnerController.listPartners(req, res));
app.get('/api/v1/partners/:partnerId', (req, res) => partnerController.getPartner(req, res));

// Protected routes (require API key)
app.use('/api/v1/chargers', apiKeyAuth);
app.post('/api/v1/chargers', (req, res) => chargerController.initializeCharger(req, res));
app.get('/api/v1/chargers/:chargerId', (req, res) => chargerController.getStatus(req, res));
app.put('/api/v1/chargers/:chargerId/status', (req, res) => chargerController.updateStatus(req, res));
app.get('/api/v1/partners/:partnerId/chargers', apiKeyAuth, (req, res) => chargerController.getPartnerChargers(req, res));

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
