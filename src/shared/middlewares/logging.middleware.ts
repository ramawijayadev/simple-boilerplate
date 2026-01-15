/**
 * HTTP Logging Middleware
 *
 * Uses pino-http for structured HTTP request/response logging.
 * - Automatic request/response logging
 * - Custom log levels based on status code
 * - Request ID integration
 * - Sensitive header redaction
 */

import pinoHttp from 'pino-http';
import { logger } from '../utils/logger';

export const loggingMiddleware = pinoHttp({
  logger,

  // Custom log level based on response status
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  // Custom error message
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode} failed`;
  },

  // Rename attribute keys
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },

  // Use existing request ID
  genReqId: (req) => req.id,

  // Custom request serializer - exclude sensitive headers
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
