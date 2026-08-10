/**
 * Axios interceptors for request/response handling
 */

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { ApiError } from './types';

/**
 * Request interceptor
 * - Add auth token if available
 * - Add common headers
 */
export function setupRequestInterceptor(
  instance: ReturnType<typeof axios.create>
) {
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const clerkObj = (
        window as unknown as {
          Clerk?: {
            session?: { getToken: () => Promise<string | null> };
          };
        }
      ).Clerk;

      if (clerkObj?.session) {
        try {
          const token = await clerkObj.session.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          console.warn('Failed to retrieve Clerk token:', err);
        }
      }
    }

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
      if (
        typeof window !== 'undefined' &&
        error.response?.status === 401 &&
        !window.location.pathname.startsWith('/sign-in') &&
        !window.location.pathname.startsWith('/sign-up')
      ) {
        window.location.href = '/sign-in';
      }

      const normalizedError = normalizeError(error);
      return Promise.reject(normalizedError);
    }
  );
}


/**
 * Normalize axios error to standardized format
 */
function normalizeError(error: AxiosError): ApiError {
  // API error response
  if (error.response?.status && error.response.data) {
    const data = error.response.data as {
      error?: string | { code?: string; message?: string };
      message?: string;
      details?: Record<string, unknown>;
    };

    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'An error occurred';

    if (typeof data.error === 'string') {
      errorCode = data.error;
    } else if (data.error && typeof data.error === 'object' && data.error.code) {
      errorCode = data.error.code;
      errorMessage = data.error.message || errorMessage;
    }

    if (data.message) {
      errorMessage = data.message;
    }

    return new ApiError(
      errorCode,
      errorMessage,
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
