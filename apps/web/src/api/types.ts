/**
 * API response types
 */

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * API error for typed error handling
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Normalized API error
 */
export interface NormalizedError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status: number;
}
