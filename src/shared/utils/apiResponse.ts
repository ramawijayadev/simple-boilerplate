/**
 * API Response Helper
 *
 * Centralized success response builder for consistent API response shapes.
 */

import { Response } from 'express';

interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Send a standardized success response
 *
 * @param res - Express response object
 * @param status - HTTP status code (200 or 201)
 * @param data - Response payload
 * @param options - Optional meta and requestId
 */
export function sendSuccess<T>(
  res: Response,
  status: 200 | 201,
  data: T,
  options?: { meta?: Record<string, unknown>; requestId?: string }
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(options?.meta && { meta: options.meta }),
    ...(options?.requestId && { requestId: options.requestId }),
  };
  res.status(status).json(response);
}
