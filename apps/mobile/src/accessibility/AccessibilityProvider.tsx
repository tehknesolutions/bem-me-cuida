import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import {
  defaultAccessibilityPreferences,
  readAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AppAccessibilityPreferences,
} from '@/preferences/accessibility-preferences';
import { textSizeMultiplier } from '@/services/accessibility-policy';

type AccessibilityContextValue = {
  preferences: AppAccessibilityPreferences;
  reduceMotion: boolean;
  fontScale: number;
  updatePreferences: (next: AppAccessibilityPreferences) => Promise<void>;
  refreshPreferences: () => Promise<void>;
};

const AccessibilityContext = createContext<AccessibilityContextValue>({
  preferences: defaultAccessibilityPreferences,
  reduceMotion: false,
  fontScale: 1,
  updatePreferences: async () => undefined,
  refreshPreferences: async () => undefined,
});

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState(defaultAccessibilityPreferences);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  const refreshPreferences = useCallback(async () => {
    if (!session) {
      setPreferences(defaultAccessibilityPreferences);
      return;
    }
    setPreferences(await readAccessibilityPreferences(session.user.id));
  }, [session]);

  const updatePreferences = useCallback(async (next: AppAccessibilityPreferences) => {
    if (!session) return;
    await saveAccessibilityPreferences(session.user.id, next);
    setPreferences(next);
  }, [session]);

  useEffect(() => {
    void refreshPreferences();
  }, [refreshPreferences]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setSystemReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo<AccessibilityContextValue>(() => ({
    preferences,
    reduceMotion: preferences.reduceMotion || systemReduceMotion,
    fontScale: textSizeMultiplier(preferences.textSize),
    updatePreferences,
    refreshPreferences,
  }), [preferences, refreshPreferences, systemReduceMotion, updatePreferences]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAppAccessibility(): AccessibilityContextValue {
  return useContext(AccessibilityContext);
}
