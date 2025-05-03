import axios, { 
  AxiosInstance, 
  AxiosError, 
  InternalAxiosRequestConfig,
  AxiosResponse
} from 'axios';
import { ApiEndpoints, ApiResponse, ErrorResponse } from '../types/api.types';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: process.env.NODE_ENV === 'development'
    ? '/api'
    : process.env.EXPO_PUBLIC_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get token from secure storage if you have authentication
      // const token = await SecureStore.getItemAsync('userToken');
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Modify the response data while maintaining the AxiosResponse structure
    return {
      ...response,
      data: response.data as ApiResponse<unknown>
    };
  },
  (error: AxiosError<ErrorResponse>) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
      throw error.response.data;
    } else if (error.request) {
      // Request was made but no response
      console.error('Network Error:', error.request);
      const networkError: ErrorResponse = {
        message: 'Network error occurred',
        status: 0,
      };
      throw networkError;
    } else {
      // Something else happened
      console.error('Error:', error.message);
      const unknownError: ErrorResponse = {
        message: error.message || 'An unknown error occurred',
        status: 0,
      };
      throw unknownError;
    }
  }
);

// Helper function to extract data from response
const extractData = <T>(response: AxiosResponse): ApiResponse<T> => {
  return response.data;
};

// Modified api object with type-safe methods
const apiWithMethods = {
  ...api,
  get: async <T>(url: string, config?: InternalAxiosRequestConfig) => {
    const response = await api.get(url, config);
    return extractData<T>(response);
  },
  post: async <T>(url: string, data?: any, config?: InternalAxiosRequestConfig) => {
    const response = await api.post(url, data, config);
    return extractData<T>(response);
  },
  put: async <T>(url: string, data?: any, config?: InternalAxiosRequestConfig) => {
    const response = await api.put(url, data, config);
    return extractData<T>(response);
  },
  patch: async <T>(url: string, data?: any, config?: InternalAxiosRequestConfig) => {
    const response = await api.patch(url, data, config);
    return extractData<T>(response);
  },
  delete: async <T>(url: string, config?: InternalAxiosRequestConfig) => {
    const response = await api.delete(url, config);
    return extractData<T>(response);
  },
};

export { ApiEndpoints };
export default apiWithMethods;
