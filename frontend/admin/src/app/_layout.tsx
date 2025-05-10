import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';

// This is the root layout that will be present on all pages
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  // Wait for a moment to ensure the layout is fully mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    // Return a placeholder while the layout is initializing
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="cloudflare" />
      <Stack.Screen name="domain" />
    </Stack>
  );
}

