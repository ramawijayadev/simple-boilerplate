/**
 * Example Repository
 *
 * Database operations for the Example model using Prisma.
 */

import prisma from '@/shared/utils/prisma';
import type { Example, CreateExampleInput, UpdateExampleInput, ExampleId } from './example.types';

/**
 * Find all examples (excluding soft-deleted)
 */
export async function findAll(): Promise<Example[]> {
  return prisma.example.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
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
