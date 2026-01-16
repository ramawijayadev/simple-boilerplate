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

/**
 * Validate and build configuration object
 */
function buildConfig(): AppConfig {
  const env = getOptional('NODE_ENV', 'development');
  const port = parseInt(getOptional('PORT', '3000'), 10);

  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT value: must be a number between 0 and 65535`);
  }

  const corsOrigin = getOptional('CORS_ORIGIN', 'http://localhost:3000');
  const rateLimitWindowMs = parseInt(getOptional('RATE_LIMIT_WINDOW_MS', '900000'), 10);
  const rateLimitMax = parseInt(getOptional('RATE_LIMIT_MAX_REQUESTS', '100'), 10);
  const logLevel = getOptional('LOG_LEVEL', env === 'production' ? 'info' : 'debug');
  const logDir = getOptional('LOG_DIR', 'logs');
  const bodyLimit = getOptional('REQUEST_BODY_LIMIT', '10mb');
  const timeoutMs = parseInt(getOptional('REQUEST_TIMEOUT_MS', '30000'), 10);

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
      url: getOptional('APP_URL', 'http://localhost:3000'),
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
      idHeader: getOptional('REQUEST_ID_HEADER', 'X-Request-Id'),
    },
    jwt: {
      secret: getOptional('JWT_SECRET', 'dev_secret_do_not_use'),
      issuer: getOptional('JWT_ISSUER', 'express-api'),
      audience: getOptional('JWT_AUDIENCE', 'express-api-client'),
      accessExpiration: getOptional('JWT_ACCESS_EXPIRATION', '15m'),
    },
    auth: {
      refreshTokenExpiresDays: parseInt(getOptional('AUTH_REFRESH_TOKEN_EXPIRES_DAYS', '7'), 10),
      emailTokenExpiresMinutes: parseInt(
        getOptional('AUTH_EMAIL_TOKEN_EXPIRES_MINUTES', '1440'),
        10
      ),
      passwordResetTokenExpiresMinutes: parseInt(
        getOptional('AUTH_PASSWORD_RESET_TOKEN_EXPIRES_MINUTES', '60'),
        10
      ),
      maxLoginAttempts: parseInt(getOptional('AUTH_MAX_LOGIN_ATTEMPTS', '5'), 10),
      lockDurationMinutes: parseInt(getOptional('AUTH_LOCK_DURATION_MINUTES', '15'), 10),
    },
    mail: {
      host: getOptional('MAIL_HOST', 'localhost'),
      port: parseInt(getOptional('MAIL_PORT', '1025'), 10),
    },
  };
}

// Build and export config - will throw on startup if validation fails
export const config: AppConfig = buildConfig();

// Export helper to check environment
export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';
export const isTest = config.env === 'test';
