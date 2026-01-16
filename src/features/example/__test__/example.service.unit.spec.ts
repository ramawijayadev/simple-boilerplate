/**
 * Example Service Unit Tests
 *
 * Tests the service layer with mocked repository.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@/shared/errors';
import type { Example } from '@/features/example/example.types';

// Mock the repository
vi.mock('@/features/example/example.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}));

// Import after mocking
import * as exampleRepository from '@/features/example/example.repository';
import {
  getAllExamples,
  getExampleById,
  createExample,
  updateExample,
  deleteExample,
} from '@/features/example/example.service';

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

describe('Example Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllExamples', () => {
    it('should return paginated examples from repository', async () => {
      const paginatedResult = {
        data: [mockExample],
        meta: {
          total: 1,
          per_page: 15,
          current_page: 1,
          last_page: 1,
          from: 1,
          to: 1,
        },
      };
      vi.mocked(exampleRepository.findAll).mockResolvedValue(paginatedResult);

      const result = await getAllExamples({ page: 1, perPage: 15 });

      expect(exampleRepository.findAll).toHaveBeenCalledWith({ page: 1, perPage: 15 });
      expect(result).toEqual(paginatedResult);
    });

    it('should return empty data when no examples', async () => {
      const emptyResult = {
        data: [],
        meta: {
          total: 0,
          per_page: 15,
          current_page: 1,
          last_page: 0,
          from: 0,
          to: 0,
        },
      };
      vi.mocked(exampleRepository.findAll).mockResolvedValue(emptyResult);

      const result = await getAllExamples({ page: 1, perPage: 15 });

      expect(result).toEqual(emptyResult);
    });
  });

  describe('getExampleById', () => {
    it('should return example when found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(mockExample);

      const result = await getExampleById(1);

      expect(exampleRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockExample);
    });

    it('should throw NotFoundError when not found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(null);

      await expect(getExampleById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createExample', () => {
    it('should create example with required fields', async () => {
      const input = { name: 'New Example' };
      const created = { ...mockExample, name: 'New Example' };
      vi.mocked(exampleRepository.create).mockResolvedValue(created);

      const result = await createExample(input);

      expect(exampleRepository.create).toHaveBeenCalledWith(input, 'user');
      expect(result.name).toBe('New Example');
    });

    it('should create example with description', async () => {
      const input = { name: 'With Desc', description: 'A description' };
      const created = { ...mockExample, ...input };
      vi.mocked(exampleRepository.create).mockResolvedValue(created);

      const result = await createExample(input, 'admin');

      expect(exampleRepository.create).toHaveBeenCalledWith(input, 'admin');
      expect(result.description).toBe('A description');
    });
  });

  describe('updateExample', () => {
    it('should update example when found', async () => {
      const updated = { ...mockExample, name: 'Updated Name', updatedBy: 'user' };
      vi.mocked(exampleRepository.findById).mockResolvedValue(mockExample);
      vi.mocked(exampleRepository.update).mockResolvedValue(updated);

      const result = await updateExample(1, { name: 'Updated Name' });

      expect(exampleRepository.update).toHaveBeenCalledWith(1, { name: 'Updated Name' }, 'user');
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundError when example not found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(null);

      await expect(updateExample(999, { name: 'New' })).rejects.toThrow(NotFoundError);
      expect(exampleRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteExample', () => {
    it('should soft delete example when found', async () => {
      const deleted = { ...mockExample, deletedAt: new Date(), deletedBy: 'user' };
      vi.mocked(exampleRepository.findById).mockResolvedValue(mockExample);
      vi.mocked(exampleRepository.softDelete).mockResolvedValue(deleted);

      await deleteExample(1);

      expect(exampleRepository.softDelete).toHaveBeenCalledWith(1, 'user');
    });

    it('should throw NotFoundError when example not found', async () => {
      vi.mocked(exampleRepository.findById).mockResolvedValue(null);

      await expect(deleteExample(999)).rejects.toThrow(NotFoundError);
      expect(exampleRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
