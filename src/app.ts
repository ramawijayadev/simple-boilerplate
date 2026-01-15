/**
 * Express Application
 *
 * Main Express app configuration with middleware and routes.
 */

import express, { Express } from 'express';

import { config, isDevelopment } from './config';

import {
  helmetMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  hppMiddleware,
} from './shared/middlewares/security.middleware';

import { requestIdMiddleware } from './shared/middlewares/requestId.middleware';
import { loggingMiddleware } from './shared/middlewares/logging.middleware';
import { defaultTimeoutMiddleware } from './shared/middlewares/timeout.middleware';

import { notFoundHandler } from './shared/middlewares/notFound.middleware';
import { errorHandler } from './shared/middlewares/error.middleware';

import healthRoutes from './features/health/health.routes';
import exampleRoutes from './features/example/example.routes';

const app: Express = express();

/**
 * Security Middleware
 */
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(rateLimitMiddleware);
app.use(hppMiddleware);

/**
 * Observability
 */
app.use(requestIdMiddleware);
app.use(loggingMiddleware);

/**
 * Request Handling
 */
app.use(defaultTimeoutMiddleware);
app.use(express.json({ limit: config.request.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.request.bodyLimit }));

/**
 * Feature Routes
 */
app.use('/health', healthRoutes);
app.use('/examples', exampleRoutes);

if (isDevelopment) {
  app.get('/error', () => {
    throw new Error('Test error endpoint');
  });
}

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
