import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Language, VALID_LANGUAGES, useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLanguageChange = useCallback(async (newLanguage: Language) => {
    if (VALID_LANGUAGES.includes(newLanguage)) {
      setLanguage(newLanguage);

      // Keep everything after the language segment
      const pathSegments = pathname.split('/');
      const remainingPath = pathSegments.slice(2).join('/');

      // Navigate to same path with new language
      router.push(`/${newLanguage}/${remainingPath}` as any);
      setDropdownVisible(false);
    }
  }, [setLanguage, router, pathname]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setDropdownVisible(!dropdownVisible)}
      >
        <Text style={styles.buttonText}>{language.toUpperCase()}</Text>
        <Ionicons
          name={dropdownVisible ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#000"
        />
      </TouchableOpacity>

      {dropdownVisible && (
        <View style={styles.dropdown}>
          {VALID_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.dropdownItem,
                language === lang && styles.activeItem,
              ]}
              onPress={() => handleLanguageChange(lang)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  language === lang && styles.activeText,
                ]}
              >
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    minWidth: '100%',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeItem: {
    backgroundColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 14,
  },
  activeText: {
    fontWeight: '500',
  },
});
