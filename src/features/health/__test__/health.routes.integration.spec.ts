/**
 * Health Routes Integration Tests
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock Prisma to avoid database dependency
vi.mock('@/shared/utils/prisma', () => ({
  default: {},
  prisma: {},
}));

// Mock the example repository (since app imports it)
vi.mock('@/features/example/example.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));

// Import after mocking
import app from '@/app';

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
    });

    it('should return timestamp in response', async () => {
      const response = await request(app).get('/health');

      expect(response.body.data.timestamp).toBeDefined();
      expect(new Date(response.body.data.timestamp).getTime()).not.toBeNaN();
    });

    it('should return requestId in response', async () => {
      const response = await request(app).get('/health');

      expect(response.body.requestId).toBeDefined();
      expect(typeof response.body.requestId).toBe('string');
    });

    it('should include X-Request-Id header in response', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});
