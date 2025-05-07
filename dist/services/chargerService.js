"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChargerService = void 0;
const charger_1 = require("../models/charger");
const prisma_1 = __importDefault(require("../lib/prisma"));
class ChargerService {
    // Update charger status
    async updateChargerStatus(chargerId, status, meterValue) {
        const charger = await prisma_1.default.charger.findUnique({
            where: { id: chargerId },
            select: { id: true } // Minimal fields for validation
        });
        if (!charger) {
            throw new Error('Charger not found');
        }
        return prisma_1.default.charger.update({
            where: { id: chargerId },
            data: {
                status: status,
                meterValue: meterValue,
                lastUpdate: new Date()
            },
            // Only return necessary fields
            select: {
                id: true,
                status: true,
                meterValue: true,
                lastUpdate: true,
                createdAt: true,
                updatedAt: true,
                partnerId: true,
                partner: {
                    select: {
                        id: true,
                        name: true,
                        apiKey: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
    }
    // Get charger status
    async getChargerStatus(chargerId) {
        const charger = await prisma_1.default.charger.findUnique({
            where: { id: chargerId },
            select: {
                id: true,
                status: true,
                meterValue: true,
                lastUpdate: true,
                createdAt: true,
                updatedAt: true,
                partnerId: true,
                partner: {
                    select: {
                        id: true,
                        name: true,
                        apiKey: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        if (!charger) {
            throw new Error('Charger not found');
        }
        return charger;
    }
    // Initialize a new charger
    async initializeCharger(chargerId, partnerId) {
        const partner = await prisma_1.default.partner.findUnique({
            where: { id: partnerId },
            select: { id: true } // Minimal fields for validation
        });
        if (!partner) {
            throw new Error('Partner not found');
        }
        return prisma_1.default.charger.create({
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
                createdAt: true,
                updatedAt: true,
                partnerId: true,
                partner: {
                    select: {
                        id: true,
                        name: true,
                        apiKey: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
    }
    // Get all chargers for a partner with pagination
    async getPartnerChargers(partnerId, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 100;
        const skip = (page - 1) * limit;
        const [chargers, total] = await Promise.all([
            prisma_1.default.charger.findMany({
                where: { partnerId: partnerId },
                select: {
                    id: true,
                    status: true,
                    meterValue: true,
                    lastUpdate: true,
                    createdAt: true,
                    updatedAt: true,
                    partnerId: true,
                    partner: {
                        select: {
                            id: true,
                            name: true,
                            apiKey: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { id: 'asc' }
            }),
            prisma_1.default.charger.count({
                where: { partnerId: partnerId }
            })
        ]);
        return {
            chargers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
exports.ChargerService = ChargerService;
//# sourceMappingURL=chargerService.js.map