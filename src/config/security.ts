/**
 * Security Configuration
 *
 * Centralized security settings for all security middleware.
 */

import { config } from '@/config';
import type { CorsOptions } from 'cors';
import type { Options as RateLimitOptions } from 'express-rate-limit';
import type { HelmetOptions } from 'helmet';
import type { Options as HppOptions } from 'hpp';

/**
 * Helmet configuration
 * Provides various HTTP header protections
 */
export const helmetConfig: HelmetOptions = {
  // Content Security Policy - customize as needed for your app
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // X-Content-Type-Options: nosniff
  crossOriginEmbedderPolicy: false, // Disable if causing issues with external resources
  // X-Frame-Options: DENY
  frameguard: { action: 'deny' },
  // Strict-Transport-Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // X-XSS-Protection: 1; mode=block
  xssFilter: true,
};

/**
 * CORS configuration
 * Controls cross-origin resource sharing
 */
export const corsConfig: CorsOptions = {
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours - preflight cache
};

/**
 * Rate limiting configuration
 * Protects against brute force and DoS attacks
 */
export const rateLimitConfig: Partial<RateLimitOptions> = {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too
};

/**
 * HPP (HTTP Parameter Pollution) configuration
 * Protects against parameter pollution attacks
 */
export const hppConfig: HppOptions = {
  // Whitelist specific parameters that can have multiple values
  whitelist: [],
};
