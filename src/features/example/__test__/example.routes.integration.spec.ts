/**
 * Example Routes Integration Tests
 *
 * Tests the full HTTP request/response cycle.
 * Uses mocked repository to avoid database dependency.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { Example } from '../example.types';

// Mock the repository before importing app
vi.mock('../example.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));

// Import after mocking
import * as exampleRepository from '../example.repository';
import app from '../../../app';

// Mock example data
const mockExample: Example = {
  id: 1,
  name: 'Test Example',
  description: 'Test description',
  createdBy: 'user',
  updatedBy: null,
  deletedBy: null,
  createdAt: new Date('2026-01-15T00:00:00Z'),
  updatedAt: new Date('2026-01-15T00:00:00Z'),
  deletedAt: null,
};

describe('Example Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /examples', () => {
    it('should return 200 with array of examples', async () => {
      vi.mocked(exampleRepository.findAll).mockResolvedValue([mockExample]);

      const response = await request(app).get('/examples');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return empty array when no examples', async () => {
      vi.mocked(exampleRepository.findAll).mockResolvedValue([]);

      const response = await request(app).get('/examples');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should include requestId in response', async () => {
      vi.mocked(exampleRepository.findAll).mockResolvedValue([]);

      const response = await request(app).get('/examples');

      expect(response.body.requestId).toBeDefined();
    });
  });

  describe('POST /examples', () => {
    it('should create example with valid data', async () => {
      const input = { name: 'New Example', description: 'New description' };
      const created = { ...mockExample, ...input };
      vi.mocked(exampleRepository.create).mockResolvedValue(created);

      const response = await request(app).post('/examples').send(input);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Example');
    });

    it('should create example with only name', async () => {
      const created = { ...mockExample, description: null };
      vi.mocked(exampleRepository.create).mockResolvedValue(created);

      const response = await request(app).post('/examples').send({ name: 'Name Only' });

      expect(response.status).toBe(201);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/examples').send({ description: 'No name' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app).post('/examples').send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /examples/:id', () => {
    it('should return example when found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(mockExample);

      const response = await request(app).get('/examples/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 when not found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(null);

      const response = await request(app).get('/examples/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid id format', async () => {
      const response = await request(app).get('/examples/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /examples/:id', () => {
    it('should update example name', async () => {
      const updated = { ...mockExample, name: 'Updated Name' };
      vi.mocked(exampleRepository.findById).mockResolvedValue(mockExample);
      vi.mocked(exampleRepository.update).mockResolvedValue(updated);

      const response = await request(app).put('/examples/1').send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 404 when example not found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(null);

      const response = await request(app).put('/examples/999').send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /examples/:id', () => {
    it('should soft delete example', async () => {
      const deleted = { ...mockExample, deletedAt: new Date() };
      vi.mocked(exampleRepository.findById).mockResolvedValue(mockExample);
      vi.mocked(exampleRepository.softDelete).mockResolvedValue(deleted);

      const response = await request(app).delete('/examples/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Example deleted successfully');
    });

    it('should return 404 when example not found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(null);

      const response = await request(app).delete('/examples/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
