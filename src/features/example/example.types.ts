/**
 * Example Types
 */

// Use Prisma's generated type for the model
export type { Example } from '@prisma/client';

export type ExampleId = number;

export interface CreateExampleInput {
  name: string;
  description?: string | null;
}

export interface UpdateExampleInput {
  name?: string;
  description?: string | null;
}
