/**
 * Example Service
 *
 * Business logic for example CRUD operations.
 */

import * as exampleRepository from '@/features/example/example.repository';
import type {
  Example,
  ExampleId,
  CreateExampleInput,
  UpdateExampleInput,
  PaginatedResult,
} from '@/features/example/example.types';
import { NotFoundError } from '@/shared/errors';

export async function getAllExamples(options: {
  page: number;
  perPage: number;
}): Promise<PaginatedResult<Example>> {
  return exampleRepository.findAll(options);
}

export async function getExampleById(id: ExampleId): Promise<Example> {
  const example = await exampleRepository.findById(id);

  if (!example) {
    throw NotFoundError.resource('Example', id);
  }

  return example;
}

export async function createExample(
  input: CreateExampleInput,
  createdBy: string = 'user'
): Promise<Example> {
  return exampleRepository.create(input, createdBy);
}

export async function updateExample(
  id: ExampleId,
  input: UpdateExampleInput,
  updatedBy: string = 'user'
): Promise<Example> {
  // Check if exists
  await getExampleById(id);

  return exampleRepository.update(id, input, updatedBy);
}

export async function deleteExample(id: ExampleId, deletedBy: string = 'user'): Promise<void> {
  // Check if exists
  await getExampleById(id);

  await exampleRepository.softDelete(id, deletedBy);
}
