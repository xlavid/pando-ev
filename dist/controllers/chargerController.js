"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChargerController = void 0;
const chargerService_1 = require("../services/chargerService");
const charger_1 = require("../models/charger");
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../utils/logger"));
const chargerService = new chargerService_1.ChargerService();
// Request validation schemas
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(charger_1.ChargerStatus),
    meterValue: zod_1.z.number().min(0)
});
const initializeChargerSchema = zod_1.z.object({
    chargerId: zod_1.z.string().min(1)
});
class ChargerController {
    // Update charger status
    async updateStatus(req, res) {
        try {
            const { chargerId } = req.params;
            const validatedData = updateStatusSchema.parse(req.body);
            const updatedCharger = await chargerService.updateChargerStatus(chargerId, validatedData.status, validatedData.meterValue);
            res.json(updatedCharger);
        }
        catch (error) {
            logger_1.default.error('Error updating charger status:', error);
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({ error: 'Invalid request data', details: error.errors });
            }
            else if (error instanceof Error && error.message === 'Charger not found') {
                res.status(404).json({ error: 'Charger not found' });
            }
            else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    // Get charger status
    async getStatus(req, res) {
        try {
            const { chargerId } = req.params;
            const charger = await chargerService.getChargerStatus(chargerId);
            res.json(charger);
        }
        catch (error) {
            logger_1.default.error('Error getting charger status:', error);
            if (error instanceof Error && error.message === 'Charger not found') {
                res.status(404).json({ error: 'Charger not found' });
            }
            else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    // Initialize a new charger
    async initializeCharger(req, res) {
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
                    logger_1.default.info(`Charger ${validatedData.chargerId} already exists and belongs to partner ${req.partner.id}, returning existing record`);
                    return res.status(200).json(existingCharger);
                }
                else {
                    // If charger exists but belongs to a different partner, return error
                    logger_1.default.warn(`Charger ${validatedData.chargerId} exists but belongs to partner ${existingCharger.partnerId}, not ${req.partner.id}`);
                    return res.status(409).json({
                        error: 'Charger ID already exists and belongs to a different partner'
                    });
                }
            }
            catch (err) {
                // Charger doesn't exist, create it
                if (err instanceof Error && err.message === 'Charger not found') {
                    const charger = await chargerService.initializeCharger(validatedData.chargerId, req.partner.id);
                    return res.status(201).json(charger);
                }
                else {
                    // Some other error occurred
                    throw err;
                }
            }
        }
        catch (error) {
            logger_1.default.error('Error initializing charger:', error);
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({ error: 'Invalid request data', details: error.errors });
            }
            else if (error instanceof Error && error.message === 'Partner not found') {
                res.status(404).json({ error: 'Partner not found' });
            }
            else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    // Get all chargers for a partner
    async getPartnerChargers(req, res) {
        try {
            const { partnerId } = req.params;
            // Security check: Only allow access to the authenticated partner's chargers
            if (req.partner?.id !== partnerId) {
                return res.status(403).json({ error: 'Forbidden: You can only access your own chargers' });
            }
            // Extract pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 100;
            // Limit the maximum items per page to prevent overloading
            const safeLimit = Math.min(limit, 500);
            const result = await chargerService.getPartnerChargers(partnerId, {
                page,
                limit: safeLimit
            });
            res.json(result);
        }
        catch (error) {
            logger_1.default.error('Error fetching partner chargers:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.ChargerController = ChargerController;
//# sourceMappingURL=chargerController.js.map