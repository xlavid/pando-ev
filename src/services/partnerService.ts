import prisma from '../lib/prisma';
import { randomUUID } from 'crypto';

export class PartnerService {
  // Create a new partner
  async createPartner(name: string) {
    const apiKey = randomUUID();
    
    return prisma.partner.create({
      data: {
        name,
        apiKey
      }
    });
  }

  // Get partner by ID
  async getPartner(id: string) {
    const partner = await prisma.partner.findUnique({
      where: { id }
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    return partner;
  }

  // Get partner by API key
  async getPartnerByApiKey(apiKey: string) {
    const partner = await prisma.partner.findUnique({
      where: { apiKey }
    });

    if (!partner) {
      throw new Error('Invalid API key');
    }

    return partner;
  }

  // List all partners
  async listPartners() {
    return prisma.partner.findMany();
  }
} 