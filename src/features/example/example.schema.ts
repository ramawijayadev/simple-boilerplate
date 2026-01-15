/**
 * Example Validation Schemas
 */

import { z } from 'zod';

export const createExampleSchema = {
  body: z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(1000).nullable().optional(),
  }),
};

export const updateExampleSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number'),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).nullable().optional(),
  }),
};

export const getExampleSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number'),
  }),
};

export const deleteExampleSchema = {
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number'),
  }),
};
