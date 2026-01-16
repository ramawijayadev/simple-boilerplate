/**
 * Server Entry Point
 *
 * Starts the Express server and handles process-level errors.
 */

// Load environment variables first - must be at the very top
import 'dotenv/config';

import app from '@/app';
import { config } from '@/config';
import { logger } from '@/shared/utils/logger';

/**
 * Handle Uncaught Exceptions
 * These are synchronous errors that occur during the execution of the application code.
 */
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught Exception - shutting down');
  process.exit(1);
});

/**
 * Handle Unhandled Prejection
 * These are asynchronous errors that occur when a Promise is rejected but no catch handler is attached.
 */
process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, 'Unhandled Rejection - shutting down');
  process.exit(1);
});

/**
 * Start Server
 */
const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.env,
      logLevel: config.log.level,
    },
    `🚀 Server started on ${config.app.url}`
  );
});

/**
 * Graceful Shutdown
 */
function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, closing server...');

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during server shutdown');
      process.exit(1);
    }

    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force close after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, config.app.gracefulShutdownTimeoutMs);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
