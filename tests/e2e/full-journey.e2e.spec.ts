import 'dotenv/config';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from 'pino';

// Features
import exampleRoutes from '@/features/example/example.routes';
import authRoutes from '@/features/auth/auth.routes';

// Shared
import { prisma } from '@/shared/utils/prisma';

// Mocks
const { sendMailMock } = vi.hoisted(() => {
  return { sendMailMock: vi.fn() };
});

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

// Setup App
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
    msgPrefix: '',
    level: 'info',
  } as unknown as Logger;
  next();
});

// Routes
const v1Router = express.Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/examples', exampleRoutes);

app.use('/api/v1', v1Router);

// Error Handler
interface HttpError extends Error {
  statusCode?: number;
}
app.use(
  (
    err: HttpError,
    req: Request,
    res: Response,

    _next: NextFunction
  ) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: {
        message: err.message || 'Internal Server Error',
      },
    });
  }
);

describe('Full User Journey E2E', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Clean Database
    await prisma.example.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Authentication Module', () => {
    it('should register a new user successfully (Happy Path)', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
      vi.stubEnv('NODE_ENV', 'test');

      expect(res.status).toBe(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      // Verify DB
      const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
      expect(user).toBeDefined();
    });

    it('should fail to register with duplicate email (Negative Case)', async () => {
      // Create user first
      await prisma.user.create({
        data: {
          name: 'Existing User',
          email: 'duplicate@example.com',
          password: 'hash',
        },
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'New User',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(409); // Conflict
    });

    it('should fail to register with invalid email (Negative Case)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Bad Email',
        email: 'invalid-email',
        password: 'Password123!',
      });

      expect(res.status).toBe(400); // Bad Request (Validation)
    });

    it('should login successfully with correct credentials (Happy Path)', async () => {
      // Register first
      vi.stubEnv('NODE_ENV', 'development');
      await request(app).post('/api/v1/auth/register').send({
        name: 'Login User',
        email: 'login@example.com',
        password: 'Password123!',
      });
      vi.stubEnv('NODE_ENV', 'test');

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should fail to login with wrong password (Negative Case)', async () => {
      // Register first
      vi.stubEnv('NODE_ENV', 'development');
      await request(app).post('/api/v1/auth/register').send({
        name: 'Login User',
        email: 'wrongpass@example.com',
        password: 'Password123!',
      });
      vi.stubEnv('NODE_ENV', 'test');

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'wrongpass@example.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
    });

    it('should get profile/me with valid token', async () => {
      // Register & Login
      vi.stubEnv('NODE_ENV', 'development');
      await request(app).post('/api/v1/auth/register').send({
        name: 'Profile User',
        email: 'profile@example.com',
        password: 'Password123!',
      });
      vi.stubEnv('NODE_ENV', 'test');

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'profile@example.com',
        password: 'Password123!',
      });
      const token = loginRes.body.data.accessToken;

      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('profile@example.com');
    });

    it('should fail to access protected route without token (Negative/Security)', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Example Module (CRUD)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Setup User & Token for CRUD
      vi.stubEnv('NODE_ENV', 'development');
      await request(app).post('/api/v1/auth/register').send({
        name: 'CRUD User',
        email: 'crud@example.com',
        password: 'Password123!',
      });
      vi.stubEnv('NODE_ENV', 'test');

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'crud@example.com',
        password: 'Password123!',
      });
      accessToken = loginRes.body.data.accessToken;
    });

    it('should create a new example (Happy Path)', async () => {
      const res = await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Example',
          description: 'Description',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Example');
      expect(res.body.data.id).toBeDefined();
    });

    it('should fail to create example with missing name (Negative Case)', async () => {
      const res = await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Missing Name',
        });

      expect(res.status).toBe(400);
    });

    it('should list all examples (Happy Path)', async () => {
      // Create two examples
      await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Ex 1' });
      await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Ex 2' });

      const res = await request(app)
        .get('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(2);
    });

    it('should get a single example by ID (Happy Path)', async () => {
      const createRes = await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Single Ex' });
      const id = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/v1/examples/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    it('should return 404 for non-existent example ID (Negative Case)', async () => {
      const res = await request(app)
        .get('/api/v1/examples/999999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ID format (Edge Case)', async () => {
      const res = await request(app)
        .get('/api/v1/examples/abc')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assuming validation middleware catches non-numeric params if schema defines regex
      // If schema defines ID as number string, 'abc' fails.
      expect(res.status).toBe(400);
    });

    it('should update an example (Happy Path)', async () => {
      const createRes = await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Original Name' });
      const id = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/v1/examples/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should delete an example (Destructive Path)', async () => {
      const createRes = await request(app)
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'To Delete' });
      const id = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/v1/examples/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/v1/examples/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('Session Management & Security', () => {
    it('should revoke session on logout', async () => {
      // Register/Login
      vi.stubEnv('NODE_ENV', 'development');
      await request(app).post('/api/v1/auth/register').send({
        name: 'Logout User',
        email: 'logout@example.com',
        password: 'Password123!',
      });
      vi.stubEnv('NODE_ENV', 'test');

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'logout@example.com',
        password: 'Password123!',
      });
      const { accessToken, refreshToken } = loginRes.body.data;

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(logoutRes.status).toBe(200);

      // Try to Refresh (Should fail)
      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });
      expect(refreshRes.status).toBe(401);
    });
  });
});
