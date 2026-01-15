/**
 * Base Application Error
 *
 * Custom error class for operational errors with HTTP status codes.
 * All custom error classes should extend this.
 */

export class AppError extends Error {
  /**
   * HTTP status code
   */
  public readonly statusCode: number;

  /**
   * Whether this is an operational error (expected) vs programming error (unexpected)
   */
  public readonly isOperational: boolean;

  /**
   * Optional error code for client identification
   */
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    // Set the prototype explicitly (needed for instanceof to work properly)
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set the name to the class name
    this.name = this.constructor.name;
  }
}
