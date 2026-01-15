/**
 * Request ID Middleware
 *
 * Generates unique request IDs for request tracking.
 * - Generates UUID if not provided
 * - Accepts client-provided ID via X-Request-Id header
 * - Attaches ID to response headers
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const REQUEST_ID_HEADER = 'X-Request-Id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use client-provided request ID or generate new one
  const requestId = (req.get(REQUEST_ID_HEADER) as string) || randomUUID();

  // Attach to request object
  req.id = requestId;

  // Add to response headers
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
