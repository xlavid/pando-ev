"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Create a singleton PrismaClient instance with optimized configuration
const prisma = new client_1.PrismaClient({
    // Only log in development environments
    log: process.env.NODE_ENV === 'production' ? [] : ['error'],
    // Add connection pooling configuration
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
            // Max pool size - adjust based on your hardware
            poolTimeout: 30,
        },
    },
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map