import app from './app';
import logger from './utils/logger';

const port = process.env.PORT || 3000;

// Start server
app.listen(port, () => {
  logger.info(`EV Charger System API is running on port ${port}`);
  logger.info(`Health check available at http://localhost:${port}/health`);
});
