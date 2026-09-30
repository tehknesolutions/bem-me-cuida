import * as SecureStore from 'expo-secure-store';

function keyFor(userId: string): string {
  return `bemmecuida.onboarding-complete.${userId}`;
}

export async function readCachedOnboarding(userId: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(keyFor(userId))) === 'true';
}

export async function cacheOnboardingComplete(userId: string): Promise<void> {
  await SecureStore.setItemAsync(keyFor(userId), 'true', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearCachedOnboarding(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(userId));
}
