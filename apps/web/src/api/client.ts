/**
 * Typed API client
 * Centralized axios instance with interceptors
 */

import axios, { type AxiosRequestConfig } from 'axios';
import { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';
import { ApiError, type ApiResponse } from './types';

/**
 * Base URL from environment or default
 */
const baseURL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

/**
 * Create and configure axios instance
 */
const client = axios.create({
  baseURL,
  timeout: 30000, // 30 seconds
});

// Setup interceptors
setupRequestInterceptor(client);
setupResponseInterceptor(client);

/**
 * Typed GET request
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.get<ApiResponse<T>>(url, config);
  if (!response.data.success) {
    throw new ApiError(
      response.data.error || 'API_ERROR',
      response.data.message || 'API request failed',
      response.data.details,
      response.status,
      response.data.requestId || (response.headers['x-request-id'] as string | undefined)
    );
  }
  return response.data.data;
}

/**
 * Typed POST request
 */
export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.post<ApiResponse<T>>(url, data, config);
  if (!response.data.success) {
    throw new ApiError(
      response.data.error || 'API_ERROR',
      response.data.message || 'API request failed',
      response.data.details,
      response.status,
      response.data.requestId || (response.headers['x-request-id'] as string | undefined)
    );
  }
  return response.data.data;
}

/**
 * Typed PATCH request
 */
export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.patch<ApiResponse<T>>(url, data, config);
  if (!response.data.success) {
    throw new ApiError(
      response.data.error || 'API_ERROR',
      response.data.message || 'API request failed',
      response.data.details,
      response.status,
      response.data.requestId || (response.headers['x-request-id'] as string | undefined)
    );
  }
  return response.data.data;
}

/**
 * Typed DELETE request
 */
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.delete<ApiResponse<T>>(url, config);
  if (!response.data.success) {
    throw new ApiError(
      response.data.error || 'API_ERROR',
      response.data.message || 'API request failed',
      response.data.details,
      response.status,
      response.data.requestId || (response.headers['x-request-id'] as string | undefined)
    );
  }
  return response.data.data;
}
