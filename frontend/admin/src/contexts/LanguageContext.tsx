import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

export type Language = 'en' | 'fr';
export const VALID_LANGUAGES: Language[] = ['en', 'fr'];
const DEFAULT_LANGUAGE: Language = 'fr';
export const LANGUAGE_STORAGE_KEY = 'app_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const { lang } = useLocalSearchParams<{ lang: string }>();

  // Update language when URL param changes
  useEffect(() => {
    if (lang && VALID_LANGUAGES.includes(lang as Language)) {
      setLanguageState(lang as Language);
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  }, [lang]);

  // Load initial language from storage if no URL param
  useEffect(() => {
    if (!lang) {
      async function loadLanguage() {
        try {
          const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
          if (storedLanguage && VALID_LANGUAGES.includes(storedLanguage as Language)) {
            setLanguageState(storedLanguage as Language);
          }
        } catch (error) {
          console.error('Error loading language:', error);
        }
      }
      loadLanguage();
    }
  }, [lang]);

  const setLanguage = async (newLanguage: Language) => {
    if (VALID_LANGUAGES.includes(newLanguage)) {
      setLanguageState(newLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
