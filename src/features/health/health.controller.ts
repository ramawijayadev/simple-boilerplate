/**
 * Health Controller
 */

import { Request, Response } from 'express';
import { getHealthStatus } from './health.service';

/**
 * GET /health
 * Returns current server health status
 */
export function getHealth(req: Request, res: Response): void {
  req.log.info('Health check requested');

  const healthStatus = getHealthStatus();

  res.status(200).json({
    success: true,
    data: healthStatus,
    requestId: req.id,
  });
}
