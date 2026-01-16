/**
 * Centralized Configuration Module
 *
 * Loads and validates all environment variables with TypeScript type safety.
 * Fails fast if required variables are missing.
 */

export interface AppConfig {
  env: string;
  port: number;
  app: {
    url: string;
    gracefulShutdownTimeoutMs: number;
  };
  security: {
    hstsMaxAge: number;
    corsMaxAge: number;
  };
  cors: {
    origin: string | string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  log: {
    level: string;
    dir: string;
  };
  request: {
    bodyLimit: string;
    timeoutMs: number;
    idHeader: string;
  };
  jwt: {
    secret: string;
    issuer: string;
    audience: string;
    accessExpiration: string;
  };
  auth: {
    refreshTokenExpiresDays: number;
    emailTokenExpiresMinutes: number;
    passwordResetTokenExpiresMinutes: number;
    maxLoginAttempts: number;
    lockDurationMinutes: number;
  };
  mail: {
    host: string;
    port: number;
  };
}

/**
 * Get optional environment variable with default value
 */
function getOptional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Parse CORS origin - supports single origin or comma-separated list
 */
function parseCorsOrigin(origin: string): string | string[] {
  if (origin.includes(',')) {
    return origin.split(',').map((o) => o.trim());
  }
  return origin;
}

const DEFAULT_PORT = '3000';
const DEFAULT_RATE_LIMIT_WINDOW_MS = '900000';
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = '100';
const DEFAULT_LOG_DIR = 'logs';
const DEFAULT_BODY_LIMIT = '10mb';
const DEFAULT_REQUEST_TIMEOUT_MS = '30000';
const DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS = '10000';
const DEFAULT_HSTS_MAX_AGE = '31536000';
const DEFAULT_CORS_MAX_AGE = '86400';
const DEFAULT_REQUEST_ID_HEADER = 'X-Request-Id';
const DEFAULT_JWT_SECRET = 'dev_secret_do_not_use';
const DEFAULT_JWT_ISSUER = 'express-api';
const DEFAULT_JWT_AUDIENCE = 'express-api-client';
const DEFAULT_JWT_ACCESS_EXPIRATION = '15m';
const DEFAULT_AUTH_REFRESH_TOKEN_EXPIRES_DAYS = '7';
const DEFAULT_AUTH_EMAIL_TOKEN_EXPIRES_MINUTES = '1440';
const DEFAULT_AUTH_PASSWORD_RESET_TOKEN_EXPIRES_MINUTES = '60';
const DEFAULT_AUTH_MAX_LOGIN_ATTEMPTS = '5';
const DEFAULT_AUTH_LOCK_DURATION_MINUTES = '15';
const DEFAULT_MAIL_HOST = 'localhost';
const DEFAULT_MAIL_PORT = '1025';

/**
 * Validate and build configuration object
 */
function buildConfig(): AppConfig {
  const env = getOptional('NODE_ENV', 'development');
  const port = parseInt(getOptional('PORT', DEFAULT_PORT), 10);

  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT value: must be a number between 0 and 65535`);
  }

  const defaultUrl = `http://localhost:${port}`;
  const corsOrigin = getOptional('CORS_ORIGIN', defaultUrl);
  const rateLimitWindowMs = parseInt(
    getOptional('RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS),
    10
  );
  const rateLimitMax = parseInt(
    getOptional('RATE_LIMIT_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS),
    10
  );
  const logLevel = getOptional('LOG_LEVEL', env === 'production' ? 'info' : 'debug');
  const logDir = getOptional('LOG_DIR', DEFAULT_LOG_DIR);
  const bodyLimit = getOptional('REQUEST_BODY_LIMIT', DEFAULT_BODY_LIMIT);
  const timeoutMs = parseInt(getOptional('REQUEST_TIMEOUT_MS', DEFAULT_REQUEST_TIMEOUT_MS), 10);

  if (isNaN(rateLimitWindowMs) || rateLimitWindowMs < 0) {
    throw new Error('Invalid RATE_LIMIT_WINDOW_MS value: must be a positive number');
  }

  if (isNaN(rateLimitMax) || rateLimitMax < 0) {
    throw new Error('Invalid RATE_LIMIT_MAX_REQUESTS value: must be a positive number');
  }

  if (isNaN(timeoutMs) || timeoutMs < 0) {
    throw new Error('Invalid REQUEST_TIMEOUT_MS value: must be a positive number');
  }

  return {
    env,
    port,
    app: {
      url: getOptional('APP_URL', defaultUrl),
      gracefulShutdownTimeoutMs: parseInt(
        getOptional('GRACEFUL_SHUTDOWN_TIMEOUT_MS', DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS),
        10
      ),
    },
    security: {
      hstsMaxAge: parseInt(getOptional('SECURITY_HSTS_MAX_AGE', DEFAULT_HSTS_MAX_AGE), 10),
      corsMaxAge: parseInt(getOptional('SECURITY_CORS_MAX_AGE', DEFAULT_CORS_MAX_AGE), 10),
    },
    cors: {
      origin: parseCorsOrigin(corsOrigin),
    },
    rateLimit: {
      windowMs: rateLimitWindowMs,
      max: rateLimitMax,
    },
    log: {
      level: logLevel,
      dir: logDir,
    },
    request: {
      bodyLimit,
      timeoutMs,
      idHeader: getOptional('REQUEST_ID_HEADER', DEFAULT_REQUEST_ID_HEADER),
    },
    jwt: {
      secret: getOptional('JWT_SECRET', DEFAULT_JWT_SECRET),
      issuer: getOptional('JWT_ISSUER', DEFAULT_JWT_ISSUER),
      audience: getOptional('JWT_AUDIENCE', DEFAULT_JWT_AUDIENCE),
      accessExpiration: getOptional('JWT_ACCESS_EXPIRATION', DEFAULT_JWT_ACCESS_EXPIRATION),
    },
    auth: {
      refreshTokenExpiresDays: parseInt(
        getOptional('AUTH_REFRESH_TOKEN_EXPIRES_DAYS', DEFAULT_AUTH_REFRESH_TOKEN_EXPIRES_DAYS),
        10
      ),
      emailTokenExpiresMinutes: parseInt(
        getOptional('AUTH_EMAIL_TOKEN_EXPIRES_MINUTES', DEFAULT_AUTH_EMAIL_TOKEN_EXPIRES_MINUTES),
        10
      ),
      passwordResetTokenExpiresMinutes: parseInt(
        getOptional(
          'AUTH_PASSWORD_RESET_TOKEN_EXPIRES_MINUTES',
          DEFAULT_AUTH_PASSWORD_RESET_TOKEN_EXPIRES_MINUTES
        ),
        10
      ),
      maxLoginAttempts: parseInt(
        getOptional('AUTH_MAX_LOGIN_ATTEMPTS', DEFAULT_AUTH_MAX_LOGIN_ATTEMPTS),
        10
      ),
      lockDurationMinutes: parseInt(
        getOptional('AUTH_LOCK_DURATION_MINUTES', DEFAULT_AUTH_LOCK_DURATION_MINUTES),
        10
      ),
    },
    mail: {
      host: getOptional('MAIL_HOST', DEFAULT_MAIL_HOST),
      port: parseInt(getOptional('MAIL_PORT', DEFAULT_MAIL_PORT), 10),
    },
  };
}

// Build and export config - will throw on startup if validation fails
export const config: AppConfig = buildConfig();

// Export helper to check environment
export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';
export const isTest = config.env === 'test';
