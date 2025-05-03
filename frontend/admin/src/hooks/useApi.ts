import { useState, useCallback } from 'react';
import { InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import api from '../config/api';
import { ApiResponse, ErrorResponse } from '../types/api.types';

interface UseApiResponse<T> {
  loading: boolean;
  error: ErrorResponse | null;
  get: (params?: Record<string, unknown>) => Promise<T>;
  post: (data: unknown) => Promise<T>;
  put: (data: unknown) => Promise<T>;
  patch: (data: unknown) => Promise<T>;
  delete: () => Promise<T>;
}

type RequestConfig = Partial<Omit<InternalAxiosRequestConfig, 'url' | 'method'>> & {
  data?: unknown;
  params?: Record<string, unknown>;
};

export const useApi = <T>(endpoint: string): UseApiResponse<T> => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  const request = useCallback(async <R>(
    method: string = 'GET',
    config: RequestConfig = {}
  ): Promise<R> => {
    try {
      setLoading(true);
      setError(null);

      const headers = new AxiosHeaders();
      headers.set('Content-Type', 'application/json');
      
      if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }

      const axiosConfig: InternalAxiosRequestConfig = {
        ...config,
        headers
      };

      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await api.get<ApiResponse<R>>(endpoint, axiosConfig);
          break;
        case 'POST':
          response = await api.post<ApiResponse<R>>(endpoint, config.data, axiosConfig);
          break;
        case 'PUT':
          response = await api.put<ApiResponse<R>>(endpoint, config.data, axiosConfig);
          break;
        case 'PATCH':
          response = await api.patch<ApiResponse<R>>(endpoint, config.data, axiosConfig);
          break;
        case 'DELETE':
          response = await api.delete<ApiResponse<R>>(endpoint, axiosConfig);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return response.data.data;
    } catch (err) {
      const errorResponse = err as ErrorResponse;
      setError(errorResponse);
      throw errorResponse;
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const get = useCallback(
    (params?: Record<string, unknown>) => request<T>('GET', { params }),
    [request]
  );

  const post = useCallback(
    (data: unknown) => request<T>('POST', { data }),
    [request]
  );

  const put = useCallback(
    (data: unknown) => request<T>('PUT', { data }),
    [request]
  );

  const patch = useCallback(
    (data: unknown) => request<T>('PATCH', { data }),
    [request]
  );

  const del = useCallback(
    () => request<T>('DELETE'),
    [request]
  );

  return {
    loading,
    error,
    get,
    post,
    put,
    patch,
    delete: del,
  };
};

export default useApi;
