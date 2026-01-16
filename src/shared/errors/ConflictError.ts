/**
 * Conflict Error (409)
 *
 * For resource conflicts (duplicate entries, etc.).
 */

import { AppError } from '@/shared/errors/AppError';

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code?: string) {
    super(message, 409, code || 'RESOURCE_CONFLICT');
  }
}
