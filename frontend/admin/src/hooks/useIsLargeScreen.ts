import { useState, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import debounce from 'lodash.debounce';

const LARGE_SCREEN_BREAKPOINT = 768;

export function useIsLargeScreen(): boolean {
  const [isLargeScreen, setIsLargeScreen] = useState(
    Dimensions.get('window').width >= LARGE_SCREEN_BREAKPOINT
  );

  // Memoized resize handler with debounce
  const handleResize = useCallback(
    debounce(() => {
      setIsLargeScreen(Dimensions.get('window').width >= LARGE_SCREEN_BREAKPOINT);
    }, 150),
    []
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => {
      subscription.remove();
    };
  }, [handleResize]);

  return isLargeScreen;
}
