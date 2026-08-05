/**
 * Axios interceptors for request/response handling
 */

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { ApiError, type NormalizedError } from './types';

/**
 * Request interceptor
 * - Add auth token if available
 * - Add common headers
 */
export function setupRequestInterceptor(
  instance: ReturnType<typeof axios.create>
) {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // TODO: Add auth token from storage when auth is implemented
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    // Set common headers
    config.headers['Content-Type'] = 'application/json';

    return config;
  });
}

/**
 * Response interceptor
 * - Normalize errors
 * - Handle specific error codes
 */
export function setupResponseInterceptor(
  instance: ReturnType<typeof axios.create>
) {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      const normalizedError = normalizeError(error);
      return Promise.reject(normalizedError);
    }
  );
}

/**
 * Normalize axios error to standardized format
 */
export function normalizeError(error: AxiosError): ApiError {
  // API error response
  if (error.response?.status && error.response.data) {
    const data = error.response.data as any;
    return new ApiError(
      data.error || 'UNKNOWN_ERROR',
      data.message || 'An error occurred',
      data.details,
      error.response.status
    );
  }

  // Network error
  if (error.message === 'Network Error') {
    return new ApiError(
      'NETWORK_ERROR',
      'Network error. Check your connection.',
      undefined,
      0
    );
  }

  // Timeout
  if (error.code === 'ECONNABORTED') {
    return new ApiError(
      'TIMEOUT',
      'Request timeout. Please try again.',
      undefined,
      408
    );
  }

  // Fallback
  return new ApiError(
    'UNKNOWN_ERROR',
    error.message || 'An unexpected error occurred',
    undefined,
    error.response?.status
  );
}
