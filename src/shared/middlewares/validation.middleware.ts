/**
 * Request Validation Middleware
 *
 * Uses Zod for type-safe request validation.
 * Validates body, query, and params against provided schemas.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError, ValidationDetails } from '@/shared/errors';

/**
 * Validation schema configuration
 */
export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Convert Zod errors to ValidationDetails object format
 */
function zodErrorToDetails(error: ZodError, prefix?: string): ValidationDetails {
  const details: ValidationDetails = {};

  for (const issue of error.issues) {
    const field = prefix ? `${prefix}.${issue.path.join('.')}` : issue.path.join('.') || 'value';
    details[field] = issue.message;
  }

  return details;
}

/**
 * Create validation middleware for request data
 *
 * @param schemas - Zod schemas for body, query, and/or params
 * @returns Express middleware that validates and types the request
 *
 * @example
 * ```typescript
 * const createUserSchema = {
 *   body: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8),
 *   }),
 * };
 *
 * router.post('/users', validate(createUserSchema), createUser);
 * ```
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: ValidationDetails = {};

    // Validate body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        Object.assign(errors, zodErrorToDetails(result.error));
      } else {
        req.body = result.data;
      }
    }

    // Validate query
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        Object.assign(errors, zodErrorToDetails(result.error, 'query'));
      } else {
        req.query = result.data as ParsedQs;
      }
    }

    // Validate params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        Object.assign(errors, zodErrorToDetails(result.error, 'params'));
      } else {
        req.params = result.data as ParamsDictionary;
      }
    }

    // If any errors, throw ValidationError
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Invalid request data', errors);
    }

    next();
  };
}

// Re-export Zod for convenience
export { z };
