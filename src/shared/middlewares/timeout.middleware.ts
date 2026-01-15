/**
 * Request Timeout Middleware
 *
 * Handles request timeouts to prevent long-running requests from hanging.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '@/config';
import { AppError } from '@/shared/errors';

/**
 * Request Timeout Error (408)
 */
export class RequestTimeoutError extends AppError {
  constructor(message: string = 'Request timeout') {
    super(message, 408, 'REQUEST_TIMEOUT');
  }
}

/**
 * Create timeout middleware with configurable duration
 *
 * @param timeoutMs - Timeout duration in milliseconds (default: from config)
 * @returns Express middleware that times out long requests
 */
export function timeoutMiddleware(timeoutMs: number = config.request.timeoutMs) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout on the request
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        next(new RequestTimeoutError(`Request exceeded ${timeoutMs}ms timeout`));
      }
    });

    // Also set timeout on the response
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        next(new RequestTimeoutError(`Response exceeded ${timeoutMs}ms timeout`));
      }
    });

    next();
  };
}

/**
 * Default timeout middleware using config value
 */
export const defaultTimeoutMiddleware = timeoutMiddleware();
