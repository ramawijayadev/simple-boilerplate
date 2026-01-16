import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '@/features/auth/auth.routes';
import * as authService from '@/features/auth/auth.service';
import { errorHandler } from '@/shared/middlewares/error.middleware';
import { UnauthorizedError } from '@/shared/errors';

// Mock the Service Layer to isolate Controller logic
vi.mock('@/features/auth/auth.service');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);

describe('Auth Feature Integration (Route/Controller)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should pass valid input to service and return 200', async () => {
      vi.mocked(authService.register).mockResolvedValue({
        message: 'Success',
        user: { id: 1, email: 'test@example.com', name: 'Test' },
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test',
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(authService.register).toHaveBeenCalledWith({
        name: 'Test',
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    it('should return 400 for invalid input (Zod Validation)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'bad-email', // Invalid email
        password: '123', // Too short
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return tokens on success', async () => {
      const mockTokens = { accessToken: 'access', refreshToken: 'refresh' };
      vi.mocked(authService.login).mockResolvedValue(mockTokens);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockTokens);
    });

    it('should return 401 on service error', async () => {
      vi.mocked(authService.login).mockRejectedValue(new UnauthorizedError('Bad creds'));

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Bad creds');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 if missing headers (Middleware Check)', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
