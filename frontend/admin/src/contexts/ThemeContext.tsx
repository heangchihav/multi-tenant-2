// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Theme that user can select
export type ThemeType = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@theme';

interface ThemeContextProps {
  theme: ThemeType;           // What user selected (light/dark/system)
  isDark: boolean;           // Simple boolean for components to use
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'system',
  isDark: false,
  setTheme: () => { },
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('system');
  const systemTheme = useColorScheme();

  // Simple boolean for components to use - true if dark mode
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  // Save theme to storage and update state
  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // Load saved theme on startup
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(savedTheme => {
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeState(savedTheme);
        }
      })
      .catch(error => console.error('Failed to load theme:', error));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
