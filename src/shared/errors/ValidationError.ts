/**
 * Validation Error (400)
 *
 * For validation failures with field-level details.
 */

import { AppError } from './AppError';

export interface ValidationDetail {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationError extends AppError {
  /**
   * Validation error details by field
   */
  public readonly details: ValidationDetail[];

  constructor(message: string = 'Validation failed', details: ValidationDetail[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }

  /**
   * Create from a single field validation error
   */
  static field(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError(`Validation failed: ${message}`, [{ field, message, value }]);
  }

  /**
   * Create from multiple field validation errors
   */
  static fields(details: ValidationDetail[]): ValidationError {
    return new ValidationError('Validation failed', details);
  }
}
