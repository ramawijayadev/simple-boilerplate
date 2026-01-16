/**
 * Response Shape Contract Tests
 *
 * Meta-tests that validate the API response contract is enforced.
 * These tests ensure errors never return 2xx and response shapes are consistent.
 */

import 'dotenv/config';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from 'pino';
import jwt from 'jsonwebtoken';
import { addDays } from 'date-fns';

import authRoutes from '@/features/auth/auth.routes';
import exampleRoutes from '@/features/example/example.routes';
import healthRoutes from '@/features/health/health.routes';
import { errorHandler } from '@/shared/middlewares/error.middleware';
import { notFoundHandler } from '@/shared/middlewares/notFound.middleware';
import { prisma } from '@/shared/utils/prisma';

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

// Setup Express App
const app = express();
app.use(express.json());

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

const v1Router = express.Router();
v1Router.use('/health', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/examples', exampleRoutes);
app.use('/api/v1', v1Router);

app.use(notFoundHandler);
app.use(errorHandler);

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_do_not_use';

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

describe('Response Shape Contract Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.example.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Success Response Contract', () => {
    it('all 2xx responses have success: true', async () => {
      const { token } = await createTestUserWithToken();

      const endpoints = [
        { method: 'get', path: '/api/v1/health', auth: false },
        { method: 'get', path: '/api/v1/examples', auth: true },
      ];

      for (const { method, path, auth } of endpoints) {
        const req = (request(app) as Record<string, CallableFunction>)[method](path);
        if (auth) req.set('Authorization', `Bearer ${token}`);
        const res = await req;

        if (res.status >= 200 && res.status < 300 && res.body && Object.keys(res.body).length > 0) {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body).not.toHaveProperty('error');
        }
      }
    });

    it('success responses have data field (can be null, object, or array)', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(['object', 'null']).toContain(typeof res.body.data);
    });

    it('list endpoints include meta field for pagination', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .get('/api/v1/examples')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('total');
    });
  });

  describe('Error Response Contract', () => {
    it('all 4xx/5xx responses have success: false', async () => {
      const { token } = await createTestUserWithToken();

      const errorEndpoints = [
        { method: 'get', path: '/api/v1/auth/me', expectedStatus: 401, auth: false },
        { method: 'get', path: '/api/v1/examples/999999', expectedStatus: 404, auth: true },
        { method: 'get', path: '/api/v1/undefined', expectedStatus: 404, auth: false },
      ];

      for (const { method, path, expectedStatus, auth } of errorEndpoints) {
        const req = (request(app) as Record<string, CallableFunction>)[method](path);
        if (auth) req.set('Authorization', `Bearer ${token}`);
        const res = await req;

        expect(res.status).toBe(expectedStatus);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('error');
        expect(res.body).not.toHaveProperty('data');
      }
    });

    it('error responses have code and message fields', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .get('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(typeof res.body.error.code).toBe('string');
      expect(typeof res.body.error.message).toBe('string');
    });

    it('error codes are UPPER_SNAKE_CASE', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .get('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    });

    it('validation errors include details as object', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Bad',
        email: 'invalid-email',
        password: '123',
      });

      expect(res.status).toBe(422);
      expect(res.body.error).toHaveProperty('details');
      expect(typeof res.body.error.details).toBe('object');
      expect(Array.isArray(res.body.error.details)).toBe(false);
    });
  });

  describe('Meta-Tests: Contract Integrity', () => {
    it('CRITICAL: errors NEVER return 2xx status', async () => {
      const { token } = await createTestUserWithToken();

      const endpoints = [
        { method: 'get', path: '/api/v1/health', auth: false },
        { method: 'get', path: '/api/v1/examples', auth: true },
        { method: 'post', path: '/api/v1/examples', body: { name: 'Test' }, auth: true },
      ];

      for (const { method, path, body, auth } of endpoints) {
        const req = (request(app) as Record<string, CallableFunction>)[method](path);
        if (auth) req.set('Authorization', `Bearer ${token}`);
        if (body) req.send(body);
        const res = await req;

        // If status is 2xx, body must not indicate failure
        if (res.status >= 200 && res.status < 300) {
          if (res.body && Object.keys(res.body).length > 0) {
            expect(res.body.success).not.toBe(false);
            expect(res.body).not.toHaveProperty('error');
          }
        }

        // If body indicates failure, status must not be 2xx
        if (res.body?.success === false || res.body?.error) {
          expect(res.status).toBeGreaterThanOrEqual(400);
        }
      }
    });

    it('CRITICAL: success responses NEVER have error field', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).not.toHaveProperty('error');
    });

    it('CRITICAL: error responses NEVER have data field', async () => {
      const { token } = await createTestUserWithToken();

      const res = await request(app)
        .get('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body).not.toHaveProperty('data');
    });

    it('all endpoints return consistent response structure', async () => {
      const { token } = await createTestUserWithToken();

      // Success shape
      const successRes = await request(app).get('/api/v1/health');
      expect(successRes.body).toMatchObject({
        success: true,
        data: expect.anything(),
      });

      // Error shape
      const errorRes = await request(app)
        .get('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${token}`);
      expect(errorRes.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
        },
      });
    });
  });
});
