/**
 * Not Found Handler Middleware
 *
 * Handles requests to undefined routes (404).
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}
