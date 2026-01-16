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
} from '@/features/example/example.service';

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const perPage = parseInt(req.query.per_page as string, 10) || 15;

    req.log.info({ page, perPage }, 'Getting all examples');

    const result = await getAllExamples({ page, perPage });

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

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
