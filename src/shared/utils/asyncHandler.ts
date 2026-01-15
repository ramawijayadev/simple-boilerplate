/**
 * Async Handler Utility
 *
 * Wraps async route handlers to catch errors and pass them to Express error handler.
 * This is an alternative to using express-async-errors package.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler to automatically catch errors
 * @param fn - Async route handler function
 * @returns Wrapped handler that catches errors
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
