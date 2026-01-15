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
import { ValidationError, ValidationDetail } from '../errors';

/**
 * Validation schema configuration
 */
export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Convert Zod errors to ValidationDetails
 */
function zodErrorToDetails(error: ZodError): ValidationDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    value: undefined, // Don't expose actual values for security
  }));
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
    const errors: ValidationDetail[] = [];

    // Validate body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...zodErrorToDetails(result.error));
      } else {
        req.body = result.data;
      }
    }

    // Validate query
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(
          ...zodErrorToDetails(result.error).map((e) => ({
            ...e,
            field: `query.${e.field}`,
          }))
        );
      } else {
        req.query = result.data as ParsedQs;
      }
    }

    // Validate params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(
          ...zodErrorToDetails(result.error).map((e) => ({
            ...e,
            field: `params.${e.field}`,
          }))
        );
      } else {
        req.params = result.data as ParamsDictionary;
      }
    }

    // If any errors, throw ValidationError
    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    next();
  };
}

// Re-export Zod for convenience
export { z };
