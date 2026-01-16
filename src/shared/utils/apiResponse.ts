/**
 * API Response Helpers
 *
 * Centralized response builders for consistent API response shapes.
 * All controllers should use these helpers instead of manual res.json() calls.
 */

import { Request, Response } from 'express';

// ============================================================
// Response Types
// ============================================================

/**
 * Standard success response shape
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Standard error response shape
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  requestId?: string;
}

// ============================================================
// Success Responses
// ============================================================

interface SendOptions {
  meta?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Send a 200 OK response with data
 */
export function sendOk<T>(res: Response, data: T, options?: SendOptions): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(options?.meta && { meta: options.meta }),
    ...(options?.requestId && { requestId: options.requestId }),
  };
  res.status(200).json(response);
}

/**
 * Send a 201 Created response with data
 */
export function sendCreated<T>(res: Response, data: T, options?: { requestId?: string }): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(options?.requestId && { requestId: options.requestId }),
  };
  res.status(201).json(response);
}

/**
 * Send a 204 No Content response
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

// ============================================================
// Request Helper
// ============================================================

/**
 * Get requestId from Express request object
 */
export function getRequestId(req: Request): string | undefined {
  if (req.id === undefined || req.id === null) {
    return undefined;
  }
  return String(req.id);
}
