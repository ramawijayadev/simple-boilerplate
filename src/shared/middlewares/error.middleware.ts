/**
 * Global Error Handler Middleware
 *
 * Handles all errors and returns consistent error responses.
 * - Logs errors with appropriate level
 * - Handles operational vs programming errors
 * - Different response format for dev vs production
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, ValidationError } from '@/shared/errors';
import { logger } from '@/shared/utils/logger';
import { isDevelopment } from '@/config';

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  requestId?: string;
}

/**
 * Determine if error is a known operational error
 */
function isOperationalError(error: Error): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Get HTTP status code from error
 */
function getStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Handle common error types
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return 401;
  }

  if (error.name === 'ValidationError') {
    return 400;
  }

  return 500;
}

/**
 * Get error code from error
 */
function getErrorCode(error: Error): string {
  if (error instanceof AppError && error.code) {
    return error.code;
  }

  // Map common error names to codes
  const errorCodeMap: Record<string, string> = {
    JsonWebTokenError: 'INVALID_TOKEN',
    TokenExpiredError: 'TOKEN_EXPIRED',
    ValidationError: 'VALIDATION_ERROR',
    SyntaxError: 'PARSE_ERROR',
  };

  return errorCodeMap[error.name] || 'INTERNAL_ERROR';
}

/**
 * Build error details for response
 */
function getErrorDetails(error: Error): unknown {
  if (error instanceof ValidationError) {
    return error.details;
  }

  // Include additional error properties if present
  const additionalProps: Record<string, unknown> = {};
  const knownProps = ['name', 'message', 'stack', 'statusCode', 'code', 'isOperational'];

  for (const [key, value] of Object.entries(error)) {
    if (!knownProps.includes(key)) {
      additionalProps[key] = value;
    }
  }

  return Object.keys(additionalProps).length > 0 ? additionalProps : undefined;
}

/**
 * Global error handler middleware
 */
export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);
  const isOperational = isOperationalError(error);

  // Log error with appropriate level
  const logData = {
    err: error,
    requestId: req.id,
    method: req.method,
    url: req.url,
    statusCode,
    isOperational,
  };

  if (statusCode >= 500) {
    // Programming errors - log as fatal/error
    logger.error(logData, `${error.name}: ${error.message}`);
  } else if (statusCode >= 400) {
    // Client errors - log as warn
    logger.warn(logData, `${error.name}: ${error.message}`);
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: isOperational || isDevelopment ? error.message : 'Internal server error',
    },
    requestId: req.id ? String(req.id) : undefined,
  };

  // Add details and stack in development
  if (isDevelopment) {
    const details = getErrorDetails(error);
    if (details) {
      errorResponse.error.details = details;
    }
    errorResponse.error.stack = error.stack;
  } else if (error instanceof ValidationError) {
    // Always include validation details in production
    errorResponse.error.details = error.details;
  }

  res.status(statusCode).json(errorResponse);
};
