/**
 * Example Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  getAllExamples,
  getExampleById,
  createExample,
  updateExample,
  deleteExample,
} from './example.service';

/**
 * GET /examples
 * Get all examples
 */
export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    req.log.info('Getting all examples');

    const examples = await getAllExamples();

    res.status(200).json({
      success: true,
      data: examples,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /examples/:id
 * Get example by ID
 */
export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    req.log.info({ exampleId: id }, 'Getting example by ID');

    const example = await getExampleById(id);

    res.status(200).json({
      success: true,
      data: example,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /examples
 * Create new example
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    req.log.info({ body: req.body }, 'Creating new example');

    const example = await createExample(req.body);

    res.status(201).json({
      success: true,
      data: example,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /examples/:id
 * Update example
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    req.log.info({ exampleId: id, body: req.body }, 'Updating example');

    const example = await updateExample(id, req.body);

    res.status(200).json({
      success: true,
      data: example,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /examples/:id
 * Soft delete example
 */
export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    req.log.info({ exampleId: id }, 'Deleting example');

    await deleteExample(id);

    res.status(200).json({
      success: true,
      message: 'Example deleted successfully',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
