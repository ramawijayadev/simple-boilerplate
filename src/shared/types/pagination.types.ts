/**
 * Pagination Types
 */

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
