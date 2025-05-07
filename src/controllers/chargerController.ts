import { Request, Response } from 'express';
import { ChargerService } from '../services/chargerService';
import { ChargerStatus } from '../models/charger';
import { z } from 'zod';
import logger from '../utils/logger';

const chargerService = new ChargerService();

// Request validation schemas
const updateStatusSchema = z.object({
  status: z.nativeEnum(ChargerStatus),
  meterValue: z.number().min(0)
});

const initializeChargerSchema = z.object({
  chargerId: z.string().min(1)
});

export class ChargerController {
  // Update charger status
  async updateStatus(req: Request, res: Response) {
    try {
      const { chargerId } = req.params;
      const validatedData = updateStatusSchema.parse(req.body);

      const updatedCharger = await chargerService.updateChargerStatus(
        chargerId,
        validatedData.status as ChargerStatus,
        validatedData.meterValue
      );

      res.json(updatedCharger);
    } catch (error) {
      logger.error('Error updating charger status:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else if (error instanceof Error && error.message === 'Charger not found') {
        res.status(404).json({ error: 'Charger not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Get charger status
  async getStatus(req: Request, res: Response) {
    try {
      const { chargerId } = req.params;
      const charger = await chargerService.getChargerStatus(chargerId);
      res.json(charger);
    } catch (error) {
      logger.error('Error getting charger status:', error);
      
      if (error instanceof Error && error.message === 'Charger not found') {
        res.status(404).json({ error: 'Charger not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Initialize a new charger
  async initializeCharger(req: Request, res: Response) {
    try {
      if (!req.partner?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const validatedData = initializeChargerSchema.parse(req.body);
      
      try {
        // First try to get existing charger
        const existingCharger = await chargerService.getChargerStatus(validatedData.chargerId);
        
        // If charger exists and belongs to this partner, return it
        if (existingCharger.partnerId === req.partner.id) {
          logger.info(`Charger ${validatedData.chargerId} already exists and belongs to partner ${req.partner.id}, returning existing record`);
          return res.status(200).json(existingCharger);
        } else {
          // If charger exists but belongs to a different partner, return error
          logger.warn(`Charger ${validatedData.chargerId} exists but belongs to partner ${existingCharger.partnerId}, not ${req.partner.id}`);
          return res.status(409).json({ 
            error: 'Charger ID already exists and belongs to a different partner' 
          });
        }
      } catch (err) {
        // Charger doesn't exist, create it
        if (err instanceof Error && err.message === 'Charger not found') {
          const charger = await chargerService.initializeCharger(
            validatedData.chargerId,
            req.partner.id
          );
          
          return res.status(201).json(charger);
        } else {
          // Some other error occurred
          throw err;
        }
      }
    } catch (error) {
      logger.error('Error initializing charger:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else if (error instanceof Error && error.message === 'Partner not found') {
        res.status(404).json({ error: 'Partner not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Get all chargers for a partner
  async getPartnerChargers(req: Request, res: Response) {
    try {
      const { partnerId } = req.params;
      
      // Security check: Only allow access to the authenticated partner's chargers
      if (req.partner?.id !== partnerId) {
        return res.status(403).json({ error: 'Forbidden: You can only access your own chargers' });
      }
      
      const chargers = await chargerService.getPartnerChargers(partnerId);
      res.json(chargers);
    } catch (error) {
      logger.error('Error fetching partner chargers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
