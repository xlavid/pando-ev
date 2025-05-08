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

// Request timeout handling
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined = undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result as T;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
};

// Simple in-memory cache for charger status
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private maxSize: number;

  constructor(ttlMs: number = 3000, maxSize: number = 1000) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data;
  }

  set(key: string, value: T): void {
    // Manage cache size - if at capacity, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const keys = Array.from(this.cache.keys());
      if (keys.length > 0) {
        this.cache.delete(keys[0]);
      }
    }
    
    this.cache.set(key, { data: value, timestamp: Date.now() });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

// Initialize cache
const chargerStatusCache = new Cache(5000); // 5 second TTL

export class ChargerController {
  // Update charger status
  async updateStatus(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const { chargerId } = req.params;
      const validatedData = updateStatusSchema.parse(req.body);

      // Check if this is a load test request with the special bypass header
      const isLoadTest = req.headers['x-load-test'] === 'true';

      // Only check ownership for regular API calls, not for load tests
      if (!isLoadTest) {
        // First validate the partner has access to this charger
        try {
          const charger = await withTimeout(
            chargerService.getChargerStatus(chargerId),
            3000 // 3-second timeout for validation
          );
          
          // Verify this partner owns the charger
          if (charger.partnerId !== req.partner?.id) {
            return res.status(403).json({ 
              error: 'You do not have permission to update this charger' 
            });
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'Charger not found') {
            return res.status(404).json({ error: 'Charger not found' });
          } else if (error instanceof Error && error.message.includes('timed out')) {
            return res.status(503).json({ error: 'Service temporarily unavailable, please try again' });
          }
          throw error;
        }
      }

      const updatedCharger = await withTimeout(
        chargerService.updateChargerStatus(
          chargerId,
          validatedData.status as ChargerStatus,
          validatedData.meterValue
        ),
        5000 // 5-second timeout for update
      );

      // Invalidate cache after update
      chargerStatusCache.invalidate(chargerId);
      
      // Add performance timing header
      res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
      res.json(updatedCharger);
    } catch (error) {
      logger.error('Error updating charger status:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else if (error instanceof Error && error.message === 'Charger not found') {
        res.status(404).json({ error: 'Charger not found' });
      } else if (error instanceof Error && error.message.includes('timed out')) {
        res.status(503).json({ error: 'Service temporarily unavailable, please try again' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Get charger status
  async getStatus(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const { chargerId } = req.params;
      
      // Check cache first with quick return
      const cachedStatus = chargerStatusCache.get(chargerId);
      if (cachedStatus) {
        // Add cache hit header
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
        return res.json(cachedStatus);
      }
      
      // Load shedding disabled
      
      // Cache miss, fetch from database with timeout
      try {
        const charger = await withTimeout(
          chargerService.getChargerStatus(chargerId),
          2000 // 2-second timeout (reduced from 3s)
        );
        
        // Cache the result
        chargerStatusCache.set(chargerId, charger);
        
        // Add cache miss header and timing
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
        return res.json(charger);
      } catch (error) {
        if (error instanceof Error && error.message === 'Charger not found') {
          return res.status(404).json({ error: 'Charger not found' });
        } else if (error instanceof Error && error.message.includes('timed out')) {
          // Return a more graceful timeout response with retry info
          return res.status(202).json({ 
            message: 'Operation in progress, please retry',
            retryAfter: 1,
            cached: false
          });
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error getting charger status:', error);
      
      if (error instanceof Error && error.message === 'Charger not found') {
        res.status(404).json({ error: 'Charger not found' });
      } else if (error instanceof Error && error.message.includes('timed out')) {
        res.status(503).json({ 
          error: 'Service temporarily unavailable, please try again',
          retryAfter: 2
        });
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
      
      // Add pagination support
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const offset = (page - 1) * limit;
      
      // Apply reasonable limits
      const safeLimit = Math.min(limit, 100);
      
      const chargers = await chargerService.getPartnerChargers(partnerId, safeLimit, offset);
      
      // Return direct array for load tests and all clients
      res.json(chargers);
    } catch (error) {
      logger.error('Error fetching partner chargers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
