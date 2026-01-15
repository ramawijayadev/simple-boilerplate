/**
 * Not Found Error (404)
 *
 * For resource not found errors.
 */

import { AppError } from './AppError';

export class NotFoundError extends AppError {
  /**
   * Resource type that was not found
   */
  public readonly resource?: string;

  /**
   * Resource identifier that was not found
   */
  public readonly resourceId?: string | number;

  constructor(message: string = 'Resource not found', resource?: string, resourceId?: string | number) {
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
    this.resourceId = resourceId;
  }

  /**
   * Create from resource type and ID
   */
  static resource(resource: string, id: string | number): NotFoundError {
    return new NotFoundError(`${resource} with id '${id}' not found`, resource, id);
  }
}
