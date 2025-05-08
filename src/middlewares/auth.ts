import { Request, Response, NextFunction } from 'express';
import { PartnerService } from '../services/partnerService';
import logger from '../utils/logger';

const partnerService = new PartnerService();

// Extend Express Request type to include partner
declare global {
  namespace Express {
    interface Request {
      partner?: {
        id: string;
        name: string;
      };
    }
  }
}

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }
};

export const adminKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-Admin-API-Key');
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  // Verify the ADMIN_API_KEY is configured
  if (!adminApiKey) {
    logger.error('ADMIN_API_KEY not configured in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'Admin API key is required' });
  }

  if (apiKey !== adminApiKey) {
    logger.warn('Invalid admin API key attempt');
    return res.status(401).json({ error: 'Invalid admin API key' });
  }
  
  next();
}; 