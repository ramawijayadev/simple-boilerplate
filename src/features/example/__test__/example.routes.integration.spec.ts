import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Example } from '@prisma/client';
import { Logger } from 'pino';
import exampleRoutes from '@/features/example/example.routes';
import * as exampleService from '@/features/example/example.service';
import { errorHandler } from '@/shared/middlewares/error.middleware';
import { AppError } from '@/shared/errors';

// Mock Service Layer
vi.mock('@/features/example/example.service');

// Mock Auth Middleware Module
vi.mock('@/shared/middlewares/auth.middleware', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { userId: 1, role: 'user' };
    next();
  }
}));

const app = express();
app.use(express.json());


// Mock Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as Request & { log: Partial<Logger> }).log = { 
    info: vi.fn(), 
    warn: vi.fn(), 
    error: vi.fn() 
  };
  next();
});
app.use('/examples', exampleRoutes);
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

  describe('GET /examples', () => {
    it('should return list of examples', async () => {
      vi.mocked(exampleService.getAllExamples).mockResolvedValue([mockExample] as Example[]);

      const res = await request(app).get('/examples');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(exampleService.getAllExamples).toHaveBeenCalled();
    });
  });

  describe('GET /examples/:id', () => {
    it('should return example by id', async () => {
      vi.mocked(exampleService.getExampleById).mockResolvedValue(mockExample as Example);

      const res = await request(app).get('/examples/1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
    });

    it('should return 404 if service throws AppError', async () => {
      vi.mocked(exampleService.getExampleById).mockRejectedValue(new AppError('Not found', 404));

      const res = await request(app).get('/examples/999');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /examples', () => {
    it('should create example', async () => {
      vi.mocked(exampleService.createExample).mockResolvedValue(mockExample as Example);

      const res = await request(app).post('/examples').send({
        name: 'New Example',
        description: 'Desc'
      });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Example');
    });

    it('should fail validation on missing name', async () => {
      const res = await request(app).post('/examples').send({ description: 'No name' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /examples/:id', () => {
    it('should update example', async () => {
      vi.mocked(exampleService.updateExample).mockResolvedValue(mockExample as Example);

      const res = await request(app).put('/examples/1').send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /examples/:id', () => {
    it('should delete example', async () => {
      vi.mocked(exampleService.deleteExample).mockResolvedValue(undefined);

      const res = await request(app).delete('/examples/1');

      expect(res.status).toBe(200);
    });
  });
});
