import * as SecureStore from 'expo-secure-store';

export type NotificationCategoryPreferences = {
  medications: boolean;
  practices: boolean;
  appointments: boolean;
  refills: boolean;
  dailyCheckIn: boolean;
};

export type NotificationPreferences = {
  enabled: boolean;
  categories: NotificationCategoryPreferences;
  quietHoursEnabled: boolean;
  quietStartLocal: string;
  quietEndLocal: string;
  dailyCheckInTimeLocal: string;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  categories: { medications: true, practices: true, appointments: true, refills: true, dailyCheckIn: false },
  quietHoursEnabled: true,
  quietStartLocal: '22:00',
  quietEndLocal: '07:00',
  dailyCheckInTimeLocal: '20:00',
};

function storageKey(userId: string): string { return `bemmecuida:notifications:${userId}`; }
function isTimeLocal(value: unknown): value is string { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function booleanOr(value: unknown, fallback: boolean): boolean { return typeof value === 'boolean' ? value : fallback; }

export async function readNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return defaultNotificationPreferences;
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences> & { categories?: Partial<NotificationCategoryPreferences> };
    return {
      enabled: booleanOr(parsed.enabled, defaultNotificationPreferences.enabled),
      categories: {
        medications: booleanOr(parsed.categories?.medications, defaultNotificationPreferences.categories.medications),
        practices: booleanOr(parsed.categories?.practices, defaultNotificationPreferences.categories.practices),
        appointments: booleanOr(parsed.categories?.appointments, defaultNotificationPreferences.categories.appointments),
        refills: booleanOr(parsed.categories?.refills, defaultNotificationPreferences.categories.refills),
        dailyCheckIn: booleanOr(parsed.categories?.dailyCheckIn, defaultNotificationPreferences.categories.dailyCheckIn),
      },
      quietHoursEnabled: booleanOr(parsed.quietHoursEnabled, defaultNotificationPreferences.quietHoursEnabled),
      quietStartLocal: isTimeLocal(parsed.quietStartLocal) ? parsed.quietStartLocal : defaultNotificationPreferences.quietStartLocal,
      quietEndLocal: isTimeLocal(parsed.quietEndLocal) ? parsed.quietEndLocal : defaultNotificationPreferences.quietEndLocal,
      dailyCheckInTimeLocal: isTimeLocal(parsed.dailyCheckInTimeLocal) ? parsed.dailyCheckInTimeLocal : defaultNotificationPreferences.dailyCheckInTimeLocal,
    };
  } catch { return defaultNotificationPreferences; }
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(preferences), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function clearNotificationPreferences(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(userId));
}
