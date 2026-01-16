/**
 * HTTP Status Code Tests
 *
 * Comprehensive tests for all HTTP status codes in the API contract.
 * Each status code is explicitly tested with response shape assertions.
 */

import 'dotenv/config';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from 'pino';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { addDays } from 'date-fns';

import authRoutes from '@/features/auth/auth.routes';
import exampleRoutes from '@/features/example/example.routes';
import healthRoutes from '@/features/health/health.routes';
import { errorHandler } from '@/shared/middlewares/error.middleware';
import { notFoundHandler } from '@/shared/middlewares/notFound.middleware';
import { prisma } from '@/shared/utils/prisma';

import {
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  assertNoErrorWith2xx,
} from './helpers';

// Mocks
const { sendMailMock } = vi.hoisted(() => ({ sendMailMock: vi.fn() }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: sendMailMock,
    }),
  },
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

// Setup Express App with full error handling
const app = express();
app.use(express.json());

// Mock Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as Request & { log: Partial<Logger> }).log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    silent: vi.fn(),
    child: vi.fn(),
    level: 'info',
  } as unknown as Logger;
  next();
});

// Routes
const v1Router = express.Router();
v1Router.use('/health', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/examples', exampleRoutes);
app.use('/api/v1', v1Router);

// Test-only: Force 500 error
app.get('/api/v1/test/error', () => {
  throw new Error('Simulated internal error');
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_do_not_use';

/**
 * Helper to create a test user and return auth token
 */
async function createTestUserWithToken(): Promise<{ token: string; userId: number }> {
  const user = await prisma.user.create({
    data: { name: 'Test User', email: `test-${Date.now()}@test.com`, password: 'hash' },
  });
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: 'hash',
      expiresAt: addDays(new Date(), 1),
    },
  });
  const token = jwt.sign({ userId: user.id, sessionId: session.id, role: 'user' }, JWT_SECRET);
  return { token, userId: user.id };
}

describe('HTTP Status Code Contract Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.example.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
  });

  // ============================================================
  // 200 OK - Successful Read
  // ============================================================
  describe('200 OK - Successful Read', () => {
    it('returns 200 with success response for GET /health', async () => {
      const res = await request(app).get('/api/v1/health');

      const body = expectSuccessResponse(res, 200);
      expect(body.data).toHaveProperty('status', 'ok');
      assertNoErrorWith2xx(res);
    });

    it('returns 200 with success response for GET /examples (list)', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .get('/api/v1/examples')
        .set('Authorization', `Bearer ${token}`);

      const body = expectSuccessResponse(res, 200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      assertNoErrorWith2xx(res);
    });

    it('returns 200 with success response for GET /examples/:id', async () => {
      const { token } = await createTestUserWithToken();
      const example = await prisma.example.create({ data: { name: 'Test Example' } });

      const res = await request(app)
        .get(`/api/v1/examples/${example.id}`)
        .set('Authorization', `Bearer ${token}`);

      const body = expectSuccessResponse(res, 200);
      expect(body.data).toHaveProperty('id', example.id);
      assertNoErrorWith2xx(res);
    });

    it('returns 200 with success response for POST /auth/login', async () => {
      const password = 'Password123!';
      const hash = await argon2.hash(password);

      await prisma.user.create({
        data: {
          name: 'Login User',
          email: 'login@test.com',
          password: hash,
          isActive: true,
        },
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@test.com',
        password: password,
      });

      const body = expectSuccessResponse(res, 200);
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      assertNoErrorWith2xx(res);
    });

    it('returns 200 with success response for GET /auth/me (authenticated)', async () => {
      const user = await prisma.user.create({
        data: { name: 'Me', email: 'me@test.com', password: 'hash' },
      });
      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: 'hash',
          expiresAt: addDays(new Date(), 1),
        },
      });
      const token = jwt.sign({ userId: user.id, sessionId: session.id, role: 'user' }, JWT_SECRET);

      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

      const body = expectSuccessResponse(res, 200);
      expect(body.data).toHaveProperty('email', 'me@test.com');
      assertNoErrorWith2xx(res);
    });
  });

  // ============================================================
  // 201 Created - Resource Created
  // ============================================================
  describe('201 Created - Resource Created', () => {
    it('returns 201 with success response for POST /auth/register', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'New User',
        email: 'new@test.com',
        password: 'SecurePassword123!',
      });

      vi.stubEnv('NODE_ENV', 'test');

      const body = expectSuccessResponse(res, 201);
      expect(body.data).toHaveProperty('user');
      assertNoErrorWith2xx(res);
    });

    it('returns 201 with success response for POST /examples', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Example',
          description: 'Test description',
        });

      const body = expectSuccessResponse(res, 201);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('name', 'New Example');
      assertNoErrorWith2xx(res);
    });
  });

  // ============================================================
  // 401 Unauthorized - Authentication Failure
  // ============================================================
  describe('401 Unauthorized - Authentication Failure', () => {
    it('returns 401 when authentication token is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expectErrorResponse(res, 401, 'AUTH_UNAUTHORIZED');
    });

    it('returns 401 when authentication token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expectErrorResponse(res, 401, 'AUTH_UNAUTHORIZED');
    });

    it('returns 401 when authentication token is expired', async () => {
      const expiredToken = jwt.sign({ userId: 1, sessionId: 1, role: 'user' }, JWT_SECRET, {
        expiresIn: '-1s',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expectErrorResponse(res, 401, 'AUTH_UNAUTHORIZED');
    });

    it('returns 401 when login credentials are invalid', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      });

      expectErrorResponse(res, 401, 'AUTH_UNAUTHORIZED');
    });

    it('returns 401 when refresh token is invalid', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid-refresh-token',
      });

      expectErrorResponse(res, 401, 'AUTH_UNAUTHORIZED');
    });

    it('returns 401 when Bearer scheme is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Basic sometoken');

      expectErrorResponse(res, 401, 'AUTH_UNAUTHORIZED');
    });
  });

  // ============================================================
  // 403 Forbidden - Authenticated but Unauthorized
  // ============================================================
  describe('403 Forbidden - Authenticated but Unauthorized', () => {
    it('returns 403 when account is inactive', async () => {
      const password = 'Password123!';
      const hash = await argon2.hash(password);

      await prisma.user.create({
        data: {
          name: 'Inactive',
          email: 'inactive@test.com',
          password: hash,
          isActive: false,
        },
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'inactive@test.com',
        password: password,
      });

      expectErrorResponse(res, 403, 'AUTH_ACCESS_DENIED');
    });

    it('returns 403 when account is locked', async () => {
      const password = 'Password123!';
      const hash = await argon2.hash(password);

      await prisma.user.create({
        data: {
          name: 'Locked',
          email: 'locked@test.com',
          password: hash,
          isActive: true,
          failedLoginAttempts: 5,
          lockedUntil: addDays(new Date(), 1),
        },
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'locked@test.com',
        password: password,
      });

      expectErrorResponse(res, 403, 'AUTH_ACCESS_DENIED');
    });
  });

  // ============================================================
  // 404 Not Found - Resource Not Found
  // ============================================================
  describe('404 Not Found - Resource Not Found', () => {
    it('returns 404 when example does not exist', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .get('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 404, 'RESOURCE_NOT_FOUND');
    });

    it('returns 404 for undefined routes', async () => {
      const res = await request(app).get('/api/v1/undefined-route');

      expectErrorResponse(res, 404, 'RESOURCE_NOT_FOUND');
    });

    it('returns 404 when updating non-existent example', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .put('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expectErrorResponse(res, 404, 'RESOURCE_NOT_FOUND');
    });

    it('returns 404 when deleting non-existent example', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .delete('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${token}`);

      expectErrorResponse(res, 404, 'RESOURCE_NOT_FOUND');
    });
  });

  // ============================================================
  // 409 Conflict - Resource Conflict
  // ============================================================
  describe('409 Conflict - Resource Conflict', () => {
    it('returns 409 when registering with duplicate email', async () => {
      await prisma.user.create({
        data: {
          name: 'Existing',
          email: 'exists@test.com',
          password: 'hash',
        },
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Duplicate',
        email: 'exists@test.com',
        password: 'Password123!',
      });

      expectErrorResponse(res, 409, 'RESOURCE_CONFLICT');
    });
  });

  // ============================================================
  // 422 Unprocessable Entity - Validation Error
  // ============================================================
  describe('422 Unprocessable Entity - Validation Error', () => {
    it('returns 422 with validation error response shape for invalid email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Bad Email',
        email: 'invalid-email',
        password: 'Password123!',
      });

      expectValidationError(res, ['email']);
    });

    it('returns 422 with validation error response shape for weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Weak Pass',
        email: 'weak@test.com',
        password: '123',
      });

      expectValidationError(res, ['password']);
    });

    it('returns 422 with validation error response shape for missing required fields', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'No name provided',
        });

      expectValidationError(res, ['name']);
    });

    it('returns 422 with validation error for invalid params', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .get('/api/v1/examples/not-a-number')
        .set('Authorization', `Bearer ${token}`);

      expectValidationError(res, ['params.id']);
    });
  });

  // ============================================================
  // 429 Too Many Requests - Rate Limit
  // ============================================================
  describe('429 Too Many Requests - Rate Limit', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      // Create isolated app with aggressive rate limiting
      const rateLimitApp = express();
      rateLimitApp.use(express.json());

      const { default: rateLimit } = await import('express-rate-limit');
      const limiter = rateLimit({
        windowMs: 1000,
        max: 1,
        message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too Many Requests' } },
      });

      rateLimitApp.use(limiter);
      rateLimitApp.get('/test', (_req, res) => res.json({ success: true, data: null }));

      // First request: OK
      const res1 = await request(rateLimitApp).get('/test');
      expect(res1.status).toBe(200);

      // Second request: Rate limited
      const res2 = await request(rateLimitApp).get('/test');
      expect(res2.status).toBe(429);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error.code).toBe('RATE_LIMITED');
    });
  });

  // ============================================================
  // 500 Internal Server Error
  // ============================================================
  describe('500 Internal Server Error', () => {
    it('returns 500 with error response for unhandled exceptions', async () => {
      const res = await request(app).get('/api/v1/test/error');

      expectErrorResponse(res, 500, 'INTERNAL_ERROR');
    });

    it('returns 500 error response without leaking stack trace in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const res = await request(app).get('/api/v1/test/error');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).not.toHaveProperty('stack');

      vi.stubEnv('NODE_ENV', 'test');
    });
  });
});
