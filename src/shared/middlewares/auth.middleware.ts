import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserSessionPayload } from '@/shared/types/auth';
import { UnauthorizedError } from '@/shared/errors';

import { config } from '@/config';

/**
 * Authentication Middleware
 * Verifies JWT Access Token and attaches payload to req.user
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authentication token'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret) as UserSessionPayload;
    req.user = payload;
    next();
  } catch {
    return next(new UnauthorizedError('Invalid token'));
  }
}
