/**
 * Pino Logger
 *
 * Professional logging with:
 * - Pretty printing in development
 * - JSON output in production
 * - Sensitive field redaction
 * - Custom serializers
 */

import pino from 'pino';
import { config, isDevelopment, isProduction } from '@/config';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists if configured
if (config.log.dir) {
  const logDir = path.resolve(config.log.dir);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Sensitive fields to redact
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.confirmPassword',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.accessToken',
  'req.body.secret',
  'req.body.apiKey',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
];

// Custom error serializer
const errorSerializer = (err: Error) => ({
  type: err.name,
  message: err.message,
  stack: isDevelopment ? err.stack : undefined,
  ...Object.fromEntries(
    Object.entries(err).filter(([key]) => !['name', 'message', 'stack'].includes(key))
  ),
});

// Base pino options
const baseOptions: pino.LoggerOptions = {
  level: config.log.level,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  serializers: {
    err: errorSerializer,
    error: errorSerializer,
  },
  base: {
    app: 'express-api',
    env: config.env,
  },
};

// Create logger with environment-specific transport
let logger: pino.Logger;

/**
 * Development Logger
 * - Pretty print to console
 * - JSON to files (app.log, error.log) with daily rotation
 */
if (isDevelopment && config.log.dir) {
  const logDir = path.resolve(config.log.dir);

  logger = pino({
    ...baseOptions,
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,app,env',
          },
        },
        {
          target: 'pino-roll',
          options: {
            file: path.join(logDir, 'app'),
            frequency: 'daily',
            dateFormat: 'yyyy-MM-dd',
            mkdir: true,
            extension: '.log',
          },
        },
        {
          target: 'pino-roll',
          level: 'error',
          options: {
            file: path.join(logDir, 'error'),
            frequency: 'daily',
            dateFormat: 'yyyy-MM-dd',
            mkdir: true,
            extension: '.log',
          },
        },
      ],
    },
  });
} else if (isProduction && config.log.dir) {
  /**
   * Production Logger
   * - JSON to stdout
   * - JSON to files (combined.log, error.log)
   */
  const logDir = path.resolve(config.log.dir);

  const streams: pino.StreamEntry[] = [
    { stream: process.stdout },
    {
      stream: fs.createWriteStream(path.join(logDir, 'combined.log'), { flags: 'a' }),
    },
    {
      level: 'error',
      stream: fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' }),
    },
  ];

  logger = pino(baseOptions, pino.multistream(streams));
} else {
  // Default fallback (e.g. if no log dir): JSON to stdout
  logger = pino(baseOptions);
}

/**
 * Create a child logger for a specific module
 * @param module - Module name for context
 */
export function createLogger(module: string): pino.Logger {
  return logger.child({ module });
}

export { logger };
export default logger;
