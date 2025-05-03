export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupCredentials {
  username: string;
  password: string;
}

export interface UserProfile {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface ErrorResponse {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// API Endpoints
export const ApiEndpoints = {
  login: '/api/v1/auth/login',
  signup: '/api/v1/auth/signup',
} as const;

export type ApiEndpointsType = typeof ApiEndpoints;
export type ApiEndpointKeys = keyof ApiEndpointsType;
