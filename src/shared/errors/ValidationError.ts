/**
 * Validation Error (422)
 *
 * For semantic validation failures with field-level details.
 * Use 422 Unprocessable Entity for validation errors per API contract.
 */

import { AppError } from '@/shared/errors/AppError';

/**
 * Validation details as object: { fieldName: "error message" }
 */
export type ValidationDetails = Record<string, string>;

export class ValidationError extends AppError {
  /**
   * Validation error details by field
   */
  public readonly details: ValidationDetails;

  constructor(message: string = 'Validation failed', details: ValidationDetails = {}) {
    super(message, 422, 'VALIDATION_ERROR');
    this.details = details;
  }

  /**
   * Create from a single field validation error
   */
  static field(field: string, message: string): ValidationError {
    return new ValidationError('Invalid request data', { [field]: message });
  }

  /**
   * Create from multiple field validation errors
   */
  static fields(details: ValidationDetails): ValidationError {
    return new ValidationError('Invalid request data', details);
  }
}
