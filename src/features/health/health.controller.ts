/**
 * Health Controller
 */

import { Request, Response } from 'express';
import { getHealthStatus } from '@/features/health/health.service';

export function getHealth(req: Request, res: Response): void {
  req.log.info('Health check requested');

  const healthStatus = getHealthStatus();

  res.status(200).json({
    success: true,
    data: healthStatus,
    requestId: req.id,
  });
}
