import * as SecureStore from 'expo-secure-store';

export type LockAfterSeconds = 0 | 30 | 60 | 300;

export type AppSecurityPreferences = {
  biometricEnabled: boolean;
  lockAfterSeconds: LockAfterSeconds;
};

export const defaultAppSecurityPreferences: AppSecurityPreferences = {
  biometricEnabled: false,
  lockAfterSeconds: 60,
};

function storageKey(userId: string): string {
  return `bemmecuida:security:${userId}`;
}

function isLockAfterSeconds(value: unknown): value is LockAfterSeconds {
  return value === 0 || value === 30 || value === 60 || value === 300;
}

export async function readAppSecurityPreferences(userId: string): Promise<AppSecurityPreferences> {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return defaultAppSecurityPreferences;

  try {
    const parsed = JSON.parse(raw) as Partial<AppSecurityPreferences>;
    return {
      biometricEnabled: parsed.biometricEnabled === true,
      lockAfterSeconds: isLockAfterSeconds(parsed.lockAfterSeconds)
        ? parsed.lockAfterSeconds
        : defaultAppSecurityPreferences.lockAfterSeconds,
    };
  } catch {
    return defaultAppSecurityPreferences;
  }
}

export async function saveAppSecurityPreferences(
  userId: string,
  preferences: AppSecurityPreferences,
): Promise<void> {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(preferences), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearAppSecurityPreferences(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(userId));
}
