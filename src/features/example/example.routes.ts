/**
 * Example Routes
 */

import { Router } from 'express';
import { validate } from '../../shared/middlewares/validation.middleware';
import {
  createExampleSchema,
  updateExampleSchema,
  getExampleSchema,
  deleteExampleSchema,
} from './example.schema';
import { index, show, create, update, destroy } from './example.controller';

const router = Router();

// GET /examples - Get all examples
router.get('/', index);

// GET /examples/:id - Get example by ID
router.get('/:id', validate(getExampleSchema), show);

// POST /examples - Create new example
router.post('/', validate(createExampleSchema), create);

// PUT /examples/:id - Update example
router.put('/:id', validate(updateExampleSchema), update);

// DELETE /examples/:id - Delete example
router.delete('/:id', validate(deleteExampleSchema), destroy);

export default router;
