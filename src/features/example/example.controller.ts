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
import { sendOk, sendCreated, getRequestId } from '@/shared/utils/apiResponse';

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const perPage = parseInt(req.query.per_page as string, 10) || 15;

    req.log.info({ page, perPage }, 'Getting all examples');

    const result = await getAllExamples({ page, perPage });

    sendOk(res, result.data, {
      meta: result.meta as unknown as Record<string, unknown>,
      requestId: getRequestId(req),
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

    sendOk(res, example, { requestId: getRequestId(req) });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    req.log.info({ body: req.body }, 'Creating new example');

    const example = await createExample(req.body);

    sendCreated(res, example, { requestId: getRequestId(req) });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    req.log.info({ exampleId: id, body: req.body }, 'Updating example');

    const example = await updateExample(id, req.body);

    sendOk(res, example, { requestId: getRequestId(req) });
  } catch (error) {
    next(error);
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    req.log.info({ exampleId: id }, 'Deleting example');

    await deleteExample(id);

    sendOk(res, null, { requestId: getRequestId(req) });
  } catch (error) {
    next(error);
  }
}
