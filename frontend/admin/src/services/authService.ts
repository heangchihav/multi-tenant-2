import { useApi } from '@/hooks/useApi';
import { ApiEndpoints, LoginCredentials, LoginResponse, SignupCredentials, UserProfile } from '../types/api.types';

export const useAuthService = () => {
  const loginApi = useApi<LoginResponse>(ApiEndpoints.login);
  const signupApi = useApi<UserProfile>(ApiEndpoints.signup);

  const login = async (credentials: LoginCredentials) => {
    const response = await loginApi.post(credentials);
    // Store token in localStorage
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  };

  const signup = async (credentials: SignupCredentials) => {
    return await signupApi.post(credentials);
  };

  const logout = () => {
    localStorage.removeItem('token');
  };

  const getToken = () => {
    return localStorage.getItem('token');
  };

  return {
    login,
    signup,
    logout,
    getToken,
  };
};

export default useAuthService;
