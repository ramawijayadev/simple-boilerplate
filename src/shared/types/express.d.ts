/**
 * Express Type Extensions
 *
 * Extends Express Request and Response types with custom properties.
 */

import { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      /**
       * Unique request ID for tracking
       */
      id: string;

      /**
       * Pino child logger with request context (added by pino-http)
       */
      log: Logger;
    }
  }
}

export {};
