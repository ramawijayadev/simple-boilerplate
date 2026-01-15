/**
 * Security Middleware Module
 *
 * Exports configured security middleware for use in the Express app.
 * Apply these middleware before routes for proper protection.
 */

import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import type { RequestHandler } from 'express';

import { helmetConfig, corsConfig, rateLimitConfig, hppConfig } from '@/config/security';

/**
 * Helmet Middleware
 *
 * Provides HTTP header security:
 * - Content-Security-Policy
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - X-XSS-Protection: 1; mode=block
 * - Strict-Transport-Security (HSTS)
 */
export const helmetMiddleware = helmet(helmetConfig);

/**
 * CORS Middleware
 *
 * Controls cross-origin resource sharing:
 * - Configurable origins from environment
 * - Credentials support enabled
 * - Standard REST methods allowed
 */
export const corsMiddleware = cors(corsConfig);

/**
 * Rate Limit Middleware
 *
 * Protects against brute force and DoS attacks:
 * - Configurable window and max requests from environment
 * - Standardized JSON error response
 * - Rate limit headers in response
 */
export const rateLimitMiddleware = rateLimit(rateLimitConfig);

/**
 * HPP (HTTP Parameter Pollution) Middleware
 *
 * Protects against parameter pollution attacks:
 * - Picks last parameter value when duplicates exist
 * - Whitelist for parameters that can have multiple values
 */
export const hppMiddleware: RequestHandler = hpp(hppConfig);
