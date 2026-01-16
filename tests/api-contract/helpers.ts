/**
 * API Contract Test Helpers
 *
 * Assertion functions for validating API response shapes and HTTP status codes.
 */

import { expect } from 'vitest';
import { Response } from 'supertest';

/**
 * Standard success response shape
 */
interface SuccessResponse {
  success: true;
  data: unknown;
  meta?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Standard error response shape
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  requestId?: string;
}

/**
 * Assert that response is a valid success response
 */
export function expectSuccessResponse(
  res: Response,
  expectedStatus: 200 | 201 = 200
): SuccessResponse {
  expect(res.status).toBe(expectedStatus);
  expect(res.body).toHaveProperty('success', true);
  expect(res.body).toHaveProperty('data');

  // Ensure no error field on success
  expect(res.body).not.toHaveProperty('error');

  return res.body as SuccessResponse;
}

/**
 * Assert that response is a valid error response
 */
export function expectErrorResponse(
  res: Response,
  expectedStatus: number,
  expectedCode?: string
): ErrorResponse {
  expect(res.status).toBe(expectedStatus);
  expect(res.body).toHaveProperty('success', false);
  expect(res.body).toHaveProperty('error');
  expect(res.body.error).toHaveProperty('code');
  expect(res.body.error).toHaveProperty('message');
  expect(typeof res.body.error.code).toBe('string');
  expect(typeof res.body.error.message).toBe('string');

  // Ensure no data field on error
  expect(res.body).not.toHaveProperty('data');

  if (expectedCode) {
    expect(res.body.error.code).toBe(expectedCode);
  }

  return res.body as ErrorResponse;
}

/**
 * Assert 204 No Content response (empty body)
 */
export function expectNoContent(res: Response): void {
  expect(res.status).toBe(204);
  expect(res.body).toEqual({});
  expect(res.text).toBe('');
}

/**
 * Assert validation error response (422)
 */
export function expectValidationError(res: Response, expectedFields?: string[]): ErrorResponse {
  const body = expectErrorResponse(res, 422, 'VALIDATION_ERROR');

  expect(body.error).toHaveProperty('details');
  expect(typeof body.error.details).toBe('object');

  if (expectedFields) {
    for (const field of expectedFields) {
      expect(body.error.details).toHaveProperty(field);
    }
  }

  return body;
}

/**
 * Assert that error never returns 2xx status
 * Meta-assertion for response contract integrity
 */
export function assertNoErrorWith2xx(res: Response): void {
  if (res.status >= 200 && res.status < 300) {
    expect(res.body.success).not.toBe(false);
    expect(res.body).not.toHaveProperty('error');
  }
}
