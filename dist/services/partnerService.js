"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const crypto_1 = require("crypto");
class PartnerService {
    // Create a new partner
    async createPartner(name) {
        const apiKey = (0, crypto_1.randomUUID)();
        return prisma_1.default.partner.create({
            data: {
                name,
                apiKey
            }
        });
    }
    // Get partner by ID
    async getPartner(id) {
        const partner = await prisma_1.default.partner.findUnique({
            where: { id },
            // Only select the fields we need
            select: {
                id: true,
                name: true,
                apiKey: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!partner) {
            throw new Error('Partner not found');
        }
        return partner;
    }
    // Get partner by API key
    async getPartnerByApiKey(apiKey) {
        const partner = await prisma_1.default.partner.findUnique({
            where: { apiKey },
            // Only select the fields we need for authentication
            select: {
                id: true,
                name: true
            }
        });
        if (!partner) {
            throw new Error('Invalid API key');
        }
        return partner;
    }
    // List all partners
    async listPartners() {
        return prisma_1.default.partner.findMany({
            // Only select the fields we need for listing
            select: {
                id: true,
                name: true,
                apiKey: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }
}
exports.PartnerService = PartnerService;
//# sourceMappingURL=partnerService.js.map