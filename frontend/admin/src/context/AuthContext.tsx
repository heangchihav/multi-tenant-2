import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';

// Define the shape of our authentication context
interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, tokens: any) => void;
  logout: () => void;
  loading: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  username: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app and makes auth available
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedAuth = localStorage.getItem('isAuthenticated') === 'true';
        const storedUsername = localStorage.getItem('username');
        
        setIsAuthenticated(storedAuth);
        setUsername(storedUsername);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setUsername(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = (username: string, tokens: any) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', username);
    
    // Store tokens if needed
    if (tokens?.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    
    setIsAuthenticated(true);
    setUsername(username);
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API
      await fetch('http://localhost:80/api/v1/auth/logout', {
        method: 'GET',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('username');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Update state
      setIsAuthenticated(false);
      setUsername(null);
      
      // Redirect to login
      router.replace('/login');
    }
  };

  // Provide the auth context value
  const value = {
    isAuthenticated,
    username,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
