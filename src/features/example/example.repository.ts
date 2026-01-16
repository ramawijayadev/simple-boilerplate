/**
 * Example Repository
 *
 * Database operations for the Example model using Prisma.
 */

import prisma from '@/shared/utils/prisma';
import type {
  Example,
  CreateExampleInput,
  UpdateExampleInput,
  ExampleId,
} from '@/features/example/example.types';

/**
 * Find all examples (excluding soft-deleted) with pagination
 */
export async function findAll(options: { page: number; perPage: number }): Promise<{
  data: Example[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}> {
  const { page, perPage } = options;
  const skip = (page - 1) * perPage;

  const [total, data] = await Promise.all([
    prisma.example.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.example.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: perPage,
    }),
  ]);

  const lastPage = Math.ceil(total / perPage);

  return {
    data,
    meta: {
      total,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
      from: skip + 1,
      to: skip + data.length,
    },
  };
}

/**
 * Find example by ID (excluding soft-deleted)
 */
export async function findById(id: ExampleId): Promise<Example | null> {
  return prisma.example.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });
}

/**
 * Create new example
 */
export async function create(data: CreateExampleInput, createdBy?: string): Promise<Example> {
  return prisma.example.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      createdBy: createdBy ?? null,
    },
  });
}

/**
 * Update example
 */
export async function update(
  id: ExampleId,
  data: UpdateExampleInput,
  updatedBy?: string
): Promise<Example> {
  return prisma.example.update({
    where: { id },
    data: {
      ...data,
      updatedBy: updatedBy ?? null,
    },
  });
}

/**
 * Soft delete example
 */
export async function softDelete(id: ExampleId, deletedBy?: string): Promise<Example> {
  return prisma.example.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: deletedBy ?? null,
    },
  });
}

/**
 * Check if example exists (including soft-deleted)
 */
export async function exists(id: ExampleId): Promise<boolean> {
  const count = await prisma.example.count({
    where: { id },
  });
  return count > 0;
}
