import * as SecureStore from 'expo-secure-store';

export type TextSizePreference = 'system' | 'large' | 'extra_large';

export type AppAccessibilityPreferences = {
  highContrast: boolean;
  reduceMotion: boolean;
  textSize: TextSizePreference;
};

export const defaultAccessibilityPreferences: AppAccessibilityPreferences = {
  highContrast: false,
  reduceMotion: false,
  textSize: 'system',
};

function storageKey(userId: string): string {
  return `bemmecuida:accessibility:${userId}`;
}

function isTextSize(value: unknown): value is TextSizePreference {
  return value === 'system' || value === 'large' || value === 'extra_large';
}

export async function readAccessibilityPreferences(userId: string): Promise<AppAccessibilityPreferences> {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return defaultAccessibilityPreferences;

  try {
    const parsed = JSON.parse(raw) as Partial<AppAccessibilityPreferences>;
    return {
      highContrast: parsed.highContrast === true,
      reduceMotion: parsed.reduceMotion === true,
      textSize: isTextSize(parsed.textSize) ? parsed.textSize : defaultAccessibilityPreferences.textSize,
    };
  } catch {
    return defaultAccessibilityPreferences;
  }
}

export async function saveAccessibilityPreferences(
  userId: string,
  preferences: AppAccessibilityPreferences,
): Promise<void> {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(preferences), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearAccessibilityPreferences(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(userId));
}
