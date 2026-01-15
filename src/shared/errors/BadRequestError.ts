/**
 * Bad Request Error (400)
 *
 * For general bad request errors.
 */

import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', code?: string) {
    super(message, 400, code || 'BAD_REQUEST');
  }
}
