import { Charger, ChargerStatus, ChargerStatusUpdate } from '../models/charger';
import prisma from '../lib/prisma';

export class ChargerService {
  // Update charger status
  async updateChargerStatus(chargerId: string, status: ChargerStatus, meterValue: number) {
    const charger = await prisma.charger.findUnique({
      where: { id: chargerId }
    });

    if (!charger) {
      throw new Error('Charger not found');
    }

    return prisma.charger.update({
      where: { id: chargerId },
      data: {
        status: status,
        meterValue: meterValue,
        lastUpdate: new Date()
      },
      include: { partner: true }
    });
  }

  // Get charger status
  async getChargerStatus(chargerId: string) {
    const charger = await prisma.charger.findUnique({
      where: { id: chargerId },
      include: { partner: true }
    });

    if (!charger) {
      throw new Error('Charger not found');
    }

    return charger;
  }

  // Initialize a new charger
  async initializeCharger(chargerId: string, partnerId: string) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    return prisma.charger.create({
      data: {
        id: chargerId,
        status: ChargerStatus.AVAILABLE,
        meterValue: 0,
        lastUpdate: new Date(),
        partner: {
          connect: { id: partnerId }
        }
      },
      include: { partner: true }
    });
  }

  // Get all chargers for a partner
  async getPartnerChargers(partnerId: string) {
    return prisma.charger.findMany({
      where: { partnerId: partnerId },
      include: { partner: true }
    });
  }
}
