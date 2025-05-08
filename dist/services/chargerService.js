"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChargerService = void 0;
const charger_1 = require("../models/charger");
const prisma_1 = __importDefault(require("../lib/prisma"));
class ChargerService {
    // Update charger status - optimized to use single query
    async updateChargerStatus(chargerId, status, meterValue) {
        try {
            // Single query update with proper field selection
            const updatedCharger = await prisma_1.default.charger.update({
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
        }
        catch (error) {
            // Handle specific Prisma error for not found
            if (error.code === 'P2025') {
                throw new Error('Charger not found');
            }
            throw error;
        }
    }
    // Get charger status - optimized with field selection
    async getChargerStatus(chargerId) {
        const charger = await prisma_1.default.charger.findUnique({
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
    async initializeCharger(chargerId, partnerId) {
        try {
            return await prisma_1.default.charger.create({
                data: {
                    id: chargerId,
                    status: charger_1.ChargerStatus.AVAILABLE,
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
        }
        catch (error) {
            // Check for specific Prisma error codes
            if (error.code === 'P2025') {
                throw new Error('Partner not found');
            }
            throw error;
        }
    }
    // Get all chargers for a partner - optimized with pagination and field selection
    async getPartnerChargers(partnerId, limit = 100, offset = 0) {
        return prisma_1.default.charger.findMany({
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
    async getMultipleChargerStatus(chargerIds) {
        if (!chargerIds.length)
            return [];
        return prisma_1.default.charger.findMany({
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
exports.ChargerService = ChargerService;
//# sourceMappingURL=chargerService.js.map