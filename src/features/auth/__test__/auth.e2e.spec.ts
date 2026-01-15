import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { addDays, addMinutes, subMinutes } from 'date-fns';
import crypto from 'crypto';

// Setup Mocks
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

// Import implementations after mocks
import authRoutes from '@/features/auth/auth.routes';
import { prisma } from '@/shared/utils/prisma';
import { UserSessionPayload } from '@/features/auth/auth.types';

// Setup Express App
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// Error Handling Middleware for Tests
import { Request, Response, NextFunction } from 'express';

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

/**
 * Helper: SHA256 Hash
 */
function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Auth Feature E2E', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Clean Database
    await prisma.userSession.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Registration', () => {
    it('should register a new user successfully and send verification email', async () => {
      // Stub env to allow email sending
      vi.stubEnv('NODE_ENV', 'development');

      const res = await request(app).post('/auth/register').send({
        name: 'New User',
        email: 'new@example.com',
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify User Persisted
      const user = await prisma.user.findUnique({ where: { email: 'new@example.com' } });
      expect(user).not.toBeNull();
      expect(user?.emailVerifiedAt).toBeNull();

      // Verify Password Hashed
      const validPass = await argon2.verify(user!.password!, 'SecurePassword123!');
      expect(validPass).toBe(true);

      // Verify Token Created
      const token = await prisma.emailVerificationToken.findFirst({ where: { userId: user!.id } });
      expect(token).not.toBeNull();

      // Verify Email Sent
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@example.com',
          subject: 'Verify your email',
        })
      );

      vi.stubEnv('NODE_ENV', 'test');
    });

    it('should fail validation with weak password or invalid email', async () => {
      // Case: Invalid Email
      let res = await request(app).post('/auth/register').send({
        name: 'Bad Email',
        email: 'bad-email',
        password: 'Password123!',
      });
      expect(res.status).toBe(400);

      // Case: Weak Password
      res = await request(app).post('/auth/register').send({
        name: 'Weak Pass',
        email: 'weak@example.com',
        password: '123',
      });
      expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      // Seed existing user
      await prisma.user.create({
        data: {
          name: 'Existing',
          email: 'exists@example.com',
          password: 'hash',
        },
      });

      const res = await request(app).post('/auth/register').send({
        name: 'Duplicate',
        email: 'exists@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/already registered/i);
    });
  });

  describe('Login', () => {
    it('should login successfully and return valid tokens', async () => {
      const password = 'Password123!';
      const hash = await argon2.hash(password);

      const user = await prisma.user.create({
        data: {
          name: 'Login User',
          email: 'login@example.com',
          password: hash,
          isActive: true,
        },
      });

      const res = await request(app).post('/auth/login').send({
        email: 'login@example.com',
        password: password,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // Verify JWT Claims
      const decoded = jwt.decode(res.body.data.accessToken) as UserSessionPayload;
      expect(decoded.userId).toBe(user.id);
      expect(decoded.role).toBe('user');

      // Verify Session in DB
      const session = await prisma.userSession.findFirst({ where: { userId: user.id } });
      expect(session).not.toBeNull();

      // Verify Refresh Token Hash
      const hashedGivenToken = hashToken(res.body.data.refreshToken);
      expect(session!.refreshTokenHash).toBe(hashedGivenToken);
    });

    it('should fail with wrong password and increment failed attempts', async () => {
      const password = 'Password123!';
      const hash = await argon2.hash(password);

      const user = await prisma.user.create({
        data: {
          name: 'Fail User',
          email: 'fail@example.com',
          password: hash,
          failedLoginAttempts: 0,
        },
      });

      const res = await request(app).post('/auth/login').send({
        email: 'fail@example.com',
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);

      // Verify attempts incremented
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser!.failedLoginAttempts).toBe(1);
    });

    it('should lock account after max attempts', async () => {
      const password = 'Password123!';
      const hash = await argon2.hash(password);

      // Seed: Start with 4 attempts (Max 5)
      await prisma.user.create({
        data: {
          name: 'Lock User',
          email: 'lock@example.com',
          password: hash,
          failedLoginAttempts: 4,
        },
      });

      // 5th attempt (Fail)
      await request(app).post('/auth/login').send({
        email: 'lock@example.com',
        password: 'Wrong',
      });

      // 6th attempt (Valid Password, but Account Locked)
      const res = await request(app).post('/auth/login').send({
        email: 'lock@example.com',
        password: password,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/locked/i);
    });

    it('should deny login if account is inactive', async () => {
      await prisma.user.create({
        data: {
          name: 'Inactive',
          email: 'inactive@example.com',
          password: 'hash',
          isActive: false,
        },
      });

      const res = await request(app).post('/auth/login').send({
        email: 'inactive@example.com',
        password: 'any',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/inactive/i);
    });
  });

  describe('Refresh Token', () => {
    it('should rotate refresh token successfully', async () => {
      const user = await prisma.user.create({
        data: { email: 'refresh@example.com', name: 'Ref', password: 'hash' },
      });

      // Seed Session
      const oldRefreshToken = 'old-refresh-token';
      const oldHash = hashToken(oldRefreshToken);

      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: oldHash,
          expiresAt: addDays(new Date(), 7),
        },
      });

      const res = await request(app).post('/auth/refresh').send({
        refreshToken: oldRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken).not.toBe(oldRefreshToken);

      // Verify old session revoked
      const oldSession = await prisma.userSession.findUnique({ where: { id: session.id } });
      expect(oldSession!.revokedAt).not.toBeNull();

      // Verify NEW session created
      const newHash = hashToken(res.body.data.refreshToken);
      const newSession = await prisma.userSession.findFirst({
        where: {
          userId: user.id,
          revokedAt: null,
          id: { not: session.id },
        },
      });

      expect(newSession).not.toBeNull();
      expect(newSession!.refreshTokenHash).toBe(newHash);
    });

    it('should reject reused or invalid token', async () => {
      const res = await request(app).post('/auth/refresh').send({
        refreshToken: 'non-existent-token',
      });
      expect(res.status).toBe(401);
    });

    it('should reject expired session', async () => {
      const user = await prisma.user.create({
        data: { email: 'expired@example.com', name: 'Exp', password: 'hash' },
      });

      const expiredToken = 'expired-token';
      const hash = hashToken(expiredToken);

      await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: hash,
          expiresAt: subMinutes(new Date(), 1), // Expired
        },
      });

      const res = await request(app).post('/auth/refresh').send({
        refreshToken: expiredToken,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/expired/i);
    });
  });

  describe('Logout', () => {
    it('should revoke session', async () => {
      const user = await prisma.user.create({
        data: { email: 'logout@example.com', name: 'Logout', password: 'hash' },
      });

      const session = await prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: 'hash',
          expiresAt: addDays(new Date(), 1),
        },
      });

      // Spoof Access Token for Middleware
      const accessToken = jwt.sign(
        { userId: user.id, sessionId: session.id, role: 'user' },
        process.env.JWT_SECRET || 'dev_secret_do_not_use'
      );

      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      // Verify revoked
      const updatedSession = await prisma.userSession.findUnique({ where: { id: session.id } });
      expect(updatedSession!.revokedAt).not.toBeNull();
    });
  });

  describe('Email Verification', () => {
    it('should verify email with valid token', async () => {
      const user = await prisma.user.create({
        data: { email: 'verify@example.com', name: 'V', password: 'hash' },
      });

      const token = 'valid-token';
      const hash = hashToken(token);

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: addMinutes(new Date(), 60),
        },
      });

      const res = await request(app).post('/auth/verify-email').send({
        token: token,
      });

      expect(res.status).toBe(200);

      // Verify Status Updated
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser!.emailVerifiedAt).not.toBeNull();

      // Verify Token Marked Used
      const updatedToken = await prisma.emailVerificationToken.findFirst({
        where: { userId: user.id },
      });
      expect(updatedToken!.usedAt).not.toBeNull();
    });
  });

  describe('Password Reset', () => {
    it('should successfully send reset email (Forgot Password)', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      await prisma.user.create({
        data: { email: 'forgot@example.com', name: 'Forgot', password: 'hash' },
      });

      const res = await request(app).post('/auth/forgot-password').send({
        email: 'forgot@example.com',
      });

      expect(res.status).toBe(200);

      // Verify Token created
      const token = await prisma.passwordResetToken.findFirst({
        where: { user: { email: 'forgot@example.com' } },
      });
      expect(token).toBeTruthy();

      // Verify Email Sent
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'forgot@example.com',
          subject: 'Reset your password',
        })
      );

      vi.stubEnv('NODE_ENV', 'test');
    });

    it('should reset password with valid token', async () => {
      const user = await prisma.user.create({
        data: { email: 'reset@example.com', name: 'Reset', password: 'oldhash' },
      });

      const token = 'reset-token';
      const hash = hashToken(token);

      const tokenRecord = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: addMinutes(new Date(), 60),
        },
      });

      const res = await request(app).post('/auth/reset-password').send({
        token: token,
        password: 'NewSecurePassword123!',
      });

      expect(res.status).toBe(200);

      // Verify Password Changed
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser!.password).not.toBe('oldhash');
      const match = await argon2.verify(updatedUser!.password!, 'NewSecurePassword123!');
      expect(match).toBe(true);

      // Verify Token Used
      const updatedToken = await prisma.passwordResetToken.findUnique({
        where: { id: tokenRecord.id },
      });
      expect(updatedToken!.usedAt).not.toBeNull();
    });
  });
});
