import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Example } from '@prisma/client';
import { Logger } from 'pino';
import exampleRoutes from '@/features/example/example.routes';
import { PaginatedResult } from '@/features/example/example.types';
import * as exampleService from '@/features/example/example.service';
import { errorHandler } from '@/shared/middlewares/error.middleware';
import { AppError } from '@/shared/errors';

// Mock Service Layer
vi.mock('@/features/example/example.service');

// Mock Auth Middleware Module
vi.mock('@/shared/middlewares/auth.middleware', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    req.user = { userId: 1, role: 'user', sessionId: 1 };
    next();
  },
}));

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
    level: 'info',
    silent: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
  next();
});
app.use('/api/v1/examples', exampleRoutes);
app.use(errorHandler);

const mockExample = {
  id: 1,
  name: 'Test Example',
  description: 'Test description',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Example Feature Integration (Route/Controller)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v1/examples', () => {
    it('should return list of examples with pagination', async () => {
      vi.mocked(exampleService.getAllExamples).mockResolvedValue({
        data: [mockExample],
        meta: {
          total: 1,
          per_page: 15,
          current_page: 1,
          last_page: 1,
          from: 1,
          to: 1,
        },
      } as unknown as PaginatedResult<Example>);

      const res = await request(app).get('/api/v1/examples');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(1);
      expect(exampleService.getAllExamples).toHaveBeenCalledWith({ page: 1, perPage: 15 });
    });

    it('should handle pagination query params', async () => {
      vi.mocked(exampleService.getAllExamples).mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          per_page: 10,
          current_page: 2,
          last_page: 0,
          from: 0,
          to: 0,
        },
      } as unknown as PaginatedResult<Example>);

      const res = await request(app).get('/api/v1/examples?page=2&per_page=10');

      expect(res.status).toBe(200);
      expect(exampleService.getAllExamples).toHaveBeenCalledWith({ page: 2, perPage: 10 });
    });
  });

  describe('GET /api/v1/examples/:id', () => {
    it('should return example by id', async () => {
      vi.mocked(exampleService.getExampleById).mockResolvedValue(mockExample as Example);

      const res = await request(app).get('/api/v1/examples/1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
    });

    it('should return 404 if service throws AppError', async () => {
      vi.mocked(exampleService.getExampleById).mockRejectedValue(new AppError('Not found', 404));

      const res = await request(app).get('/api/v1/examples/999');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/examples', () => {
    it('should create example', async () => {
      vi.mocked(exampleService.createExample).mockResolvedValue(mockExample as Example);

      const res = await request(app).post('/api/v1/examples').send({
        name: 'New Example',
        description: 'Desc',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Example');
    });

    it('should fail validation on missing name', async () => {
      const res = await request(app).post('/api/v1/examples').send({ description: 'No name' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/v1/examples/:id', () => {
    it('should update example', async () => {
      vi.mocked(exampleService.updateExample).mockResolvedValue(mockExample as Example);

      const res = await request(app).put('/api/v1/examples/1').send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/examples/:id', () => {
    it('should delete example', async () => {
      vi.mocked(exampleService.deleteExample).mockResolvedValue(undefined);

      const res = await request(app).delete('/api/v1/examples/1');

      expect(res.status).toBe(200);
    });
  });
});
