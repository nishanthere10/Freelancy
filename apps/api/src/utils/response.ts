/**
 * Standard response formatting
 * All API responses follow this format for consistency
 */

/**
 * Success response
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

/**
 * Paginated response
 */
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Create a success response
 */
export function createSuccess<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create an error response
 */
export function createError(
  error: string,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string,
): ErrorResponse {
  return {
    success: false,
    error,
    message,
    requestId,
    details,
  };
}

/**
 * Create a paginated response
 */
export function createPaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const pages = Math.ceil(total / pageSize);

  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      pages,
      hasNextPage: page < pages,
      hasPreviousPage: page > 1,
    },
  };
}
