import * as ScreenCapture from 'expo-screen-capture';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const PROTECTION_KEY = 'bemmecuida-sensitive-content';

export function PrivacyShield() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const enable = async () => {
      if (Platform.OS === 'ios') {
        await ScreenCapture.enableAppSwitcherProtectionAsync(0.85);
        return;
      }
      await ScreenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
    };

    void enable().catch(() => undefined);
    return () => {
      if (Platform.OS === 'ios') {
        void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
        return;
      }
      void ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY).catch(() => undefined);
    };
  }, []);

  return null;
}
