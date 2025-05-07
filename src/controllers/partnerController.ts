import { Request, Response } from 'express';
import { PartnerService } from '../services/partnerService';
import { z } from 'zod';
import logger from '../utils/logger';

const partnerService = new PartnerService();

// Request validation schema
const createPartnerSchema = z.object({
  name: z.string().min(1)
});

export class PartnerController {
  // Create a new partner
  async createPartner(req: Request, res: Response) {
    try {
      const validatedData = createPartnerSchema.parse(req.body);
      const partner = await partnerService.createPartner(validatedData.name);
      
      // Return the new partner with API key
      res.status(201).json(partner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        logger.error('Error creating partner:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Get a partner by ID
  async getPartner(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      const partner = await partnerService.getPartner(partnerId);
      res.json(partner);
    } catch (error) {
      if (error instanceof Error && error.message === 'Partner not found') {
        res.status(404).json({ error: 'Partner not found' });
      } else {
        logger.error('Error fetching partner:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // List all partners
  async listPartners(req: Request, res: Response) {
    try {
      const partners = await partnerService.listPartners();
      res.json(partners);
    } catch (error) {
      logger.error('Error listing partners:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 