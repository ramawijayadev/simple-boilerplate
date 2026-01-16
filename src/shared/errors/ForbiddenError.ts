/**
 * Forbidden Error (403)
 *
 * For authorization failures (authenticated but not allowed).
 */

import { AppError } from '@/shared/errors/AppError';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, 403, code || 'FORBIDDEN');
  }
}
