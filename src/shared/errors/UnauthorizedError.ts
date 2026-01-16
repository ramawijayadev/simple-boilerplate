/**
 * Unauthorized Error (401)
 *
 * For authentication failures.
 */

import { AppError } from '@/shared/errors/AppError';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, 401, code || 'UNAUTHORIZED');
  }
}
