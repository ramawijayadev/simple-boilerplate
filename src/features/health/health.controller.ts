/**
 * Health Controller
 */

import { Request, Response } from 'express';
import { getHealthStatus } from '@/features/health/health.service';
import { sendOk, getRequestId } from '@/shared/utils/apiResponse';

export function index(req: Request, res: Response): void {
  req.log.info('Health check requested');

  const healthStatus = getHealthStatus();

  sendOk(res, healthStatus, { requestId: getRequestId(req) });
}
