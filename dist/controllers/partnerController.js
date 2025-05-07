"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerController = void 0;
const partnerService_1 = require("../services/partnerService");
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../utils/logger"));
const partnerService = new partnerService_1.PartnerService();
// Request validation schema
const createPartnerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1)
});
class PartnerController {
    // Create a new partner
    async createPartner(req, res) {
        try {
            const validatedData = createPartnerSchema.parse(req.body);
            const partner = await partnerService.createPartner(validatedData.name);
            // Return the new partner with API key
            res.status(201).json(partner);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({ error: 'Invalid request data', details: error.errors });
            }
            else {
                logger_1.default.error('Error creating partner:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    // Get a partner by ID
    async getPartner(req, res) {
        try {
            const { partnerId } = req.params;
            const partner = await partnerService.getPartner(partnerId);
            res.json(partner);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Partner not found') {
                res.status(404).json({ error: 'Partner not found' });
            }
            else {
                logger_1.default.error('Error fetching partner:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    // List all partners
    async listPartners(req, res) {
        try {
            const partners = await partnerService.listPartners();
            res.json(partners);
        }
        catch (error) {
            logger_1.default.error('Error listing partners:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.PartnerController = PartnerController;
//# sourceMappingURL=partnerController.js.map