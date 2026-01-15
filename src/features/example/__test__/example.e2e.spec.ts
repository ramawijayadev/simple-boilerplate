import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import exampleRoutes from '../example.routes';
import { prisma } from '../../../shared/utils/prisma';
import { errorHandler } from '../../../shared/middlewares/error.middleware';

// Setup App (Manual, just like Auth E2E)
const app = express();
app.use(express.json());
// Mock Logger Middleware
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
// ...
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
  };
  next();
});
app.use('/examples', exampleRoutes);
app.use(errorHandler);

describe('Example Feature E2E', () => {
  beforeEach(async () => {
    // Clean DB
    await prisma.example.deleteMany();
  });

  describe('CRUD Operations', () => {
    it('should create and retrieve an example', async () => {
      // 1. Create
      const createRes = await request(app).post('/examples').send({
        name: 'E2E Test',
        description: 'Created via E2E',
      });
      
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.id).toBeDefined();
      const id = createRes.body.data.id;

      // 2. Retrieve
      const getRes = await request(app).get(`/examples/${id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.name).toBe('E2E Test');

      // 3. Verify in DB
      const dbRecord = await prisma.example.findUnique({ where: { id } });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.name).toBe('E2E Test');
    });

    it('should update an example', async () => {
      // Seed
      const example = await prisma.example.create({
        data: { name: 'Original', description: 'Desc' }
      });

      const res = await request(app).put(`/examples/${example.id}`).send({
        name: 'Updated Name'
      });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');

      const updated = await prisma.example.findUnique({ where: { id: example.id } });
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete (soft delete) an example', async () => {
      // Seed
      const example = await prisma.example.create({
        data: { name: 'To Delete' }
      });

      const res = await request(app).delete(`/examples/${example.id}`);
      expect(res.status).toBe(200);

      // Verify Soft Delete
      const deleted = await prisma.example.findUnique({ where: { id: example.id } });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('should list examples (excluding deleted)', async () => {
      await prisma.example.createMany({
        data: [
          { name: 'One' },
          { name: 'Two' },
          { name: 'Three', deletedAt: new Date() } // Deleted
        ]
      });

      const res = await request(app).get('/examples');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2); // Should not see 'Three'
    });
  });
});
