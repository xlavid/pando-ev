import { Charger, ChargerStatus, ChargerStatusUpdate } from '../models/charger';
import prisma from '../lib/prisma';

export class ChargerService {
  // Update charger status - optimized to use single query
  async updateChargerStatus(chargerId: string, status: ChargerStatus, meterValue: number) {
    try {
      // Single query update with proper field selection
      const updatedCharger = await prisma.charger.update({
        where: { id: chargerId },
        data: {
          status: status,
          meterValue: meterValue,
          lastUpdate: new Date()
        },
        select: {
          id: true,
          status: true,
          meterValue: true,
          lastUpdate: true,
          partnerId: true,
          partner: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      return updatedCharger;
    } catch (error: any) {
      // Handle specific Prisma error for not found
      if (error.code === 'P2025') {
        throw new Error('Charger not found');
      }
      throw error;
    }
  }

  // Get charger status - optimized with field selection
  async getChargerStatus(chargerId: string) {
    const charger = await prisma.charger.findUnique({
      where: { id: chargerId },
      select: {
        id: true,
        status: true,
        meterValue: true,
        lastUpdate: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!charger) {
      throw new Error('Charger not found');
    }

    return charger;
  }

  // Initialize a new charger - optimized to reduce queries
  async initializeCharger(chargerId: string, partnerId: string) {
    try {
      return await prisma.charger.create({
        data: {
          id: chargerId,
          status: ChargerStatus.AVAILABLE,
          meterValue: 0,
          lastUpdate: new Date(),
          partner: {
            connect: { id: partnerId }
          }
        },
        select: {
          id: true,
          status: true,
          meterValue: true,
          lastUpdate: true,
          partnerId: true,
          partner: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } catch (error: any) {
      // Check for specific Prisma error codes
      if (error.code === 'P2025') {
        throw new Error('Partner not found');
      }
      throw error;
    }
  }

  // Get all chargers for a partner - optimized with pagination and field selection
  async getPartnerChargers(partnerId: string, limit: number = 100, offset: number = 0) {
    return prisma.charger.findMany({
      where: { partnerId: partnerId },
      select: {
        id: true,
        status: true,
        meterValue: true,
        lastUpdate: true,
        partnerId: true,
        partner: {
          select: {
            id: true,
            name: true
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: {
        lastUpdate: 'desc' // Order by most recently updated
      }
    });
  }
  
  // New method: Bulk status check for chargers (reduces multiple individual requests)
  async getMultipleChargerStatus(chargerIds: string[]) {
    if (!chargerIds.length) return [];
    
    return prisma.charger.findMany({
      where: {
        id: {
          in: chargerIds
        }
      },
      select: {
        id: true,
        status: true,
        meterValue: true,
        lastUpdate: true,
        partnerId: true
      }
    });
  }
}
