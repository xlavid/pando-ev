"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = __importDefault(require("./utils/logger"));
const port = process.env.PORT || 3000;
// Start server
app_1.default.listen(port, () => {
    logger_1.default.info(`EV Charger System API is running on port ${port}`);
    logger_1.default.info(`Health check available at http://localhost:${port}/health`);
});
//# sourceMappingURL=index.js.map