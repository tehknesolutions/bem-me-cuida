import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { listAppointments } from '@/data/care-management-repository';
import { listCarePractices } from '@/data/care-practice-repository';
import {
  listLowStockMedications,
  listMedications,
  markRefillReminderSent,
} from '@/data/medication-repository';
import {
  clearAllNotificationBindings,
  listAllNotificationBindings,
  listNotificationBindings,
  replaceNotificationBindings,
  type ReminderEntityType,
} from '@/data/notification-repository';
import {
  readNotificationPreferences,
  type NotificationPreferences,
} from '@/preferences/notification-preferences';
import { isWithinQuietHours, timeLocalFromDate } from '@/services/notification-policy';

const CARE_CHANNEL_ID = 'care-reminders';
const QUIET_CHANNEL_ID = 'care-reminders-quiet';
const DAILY_CHECKIN_ENTITY_ID = 'daily';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type ReminderPermissionResult = 'granted' | 'denied' | 'unavailable';

async function ensureCareChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(CARE_CHANNEL_ID, {
      name: 'Lembretes de cuidado',
      description: 'Lembretes discretos configurados por você.',
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
      enableVibrate: true,
      vibrationPattern: [0, 180],
    }),
    Notifications.setNotificationChannelAsync(QUIET_CHANNEL_ID, {
      name: 'Lembretes em horário silencioso',
      description: 'Lembretes visíveis sem som ou vibração durante seu horário silencioso.',
      importance: Notifications.AndroidImportance.LOW,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
      enableVibrate: false,
      vibrationPattern: [0],
    }),
  ]);
}

function categoryEnabled(preferences: NotificationPreferences, entityType: ReminderEntityType): boolean {
  if (!preferences.enabled) return false;
  if (entityType === 'medication_schedule') return preferences.categories.medications;
  if (entityType === 'care_practice') return preferences.categories.practices;
  if (entityType === 'appointment') return preferences.categories.appointments;
  if (entityType === 'medication_refill') return preferences.categories.refills;
  return preferences.categories.dailyCheckIn;
}

function channelForTime(preferences: NotificationPreferences, timeLocal: string): string {
  return isWithinQuietHours(timeLocal, {
    enabled: preferences.quietHoursEnabled,
    startLocal: preferences.quietStartLocal,
    endLocal: preferences.quietEndLocal,
  }) ? QUIET_CHANNEL_ID : CARE_CHANNEL_ID;
}

function discreetContent(
  body: string,
  route: string,
  entityType: ReminderEntityType,
  quiet: boolean,
): Notifications.NotificationContentInput {
  return {
    title: 'Lembrete de cuidado',
    body,
    data: { route, entityType },
    ...(quiet ? { sound: false } : {}),
  };
}

export async function ensureReminderPermission(): Promise<ReminderPermissionResult> {
  if (Platform.OS === 'web') return 'unavailable';
  await ensureCareChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ? 'granted'
    : 'denied';
}

export async function getReminderPermissionStatus(): Promise<ReminderPermissionResult> {
  if (Platform.OS === 'web') return 'unavailable';
  const current = await Notifications.getPermissionsAsync();
  return current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ? 'granted'
    : 'denied';
}

export async function cancelEntityReminders(
  userId: string,
  entityType: ReminderEntityType,
  entityId: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const identifiers = await listNotificationBindings(userId, entityType, entityId);
  await Promise.all(identifiers.map(async (identifier) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // A notificação pode ter sido removida pelo sistema.
    }
  }));
  await replaceNotificationBindings(userId, entityType, entityId, []);
}

export async function scheduleEntityReminders(options: {
  userId: string;
  entityType: 'medication_schedule' | 'care_practice';
  entityId: string;
  timeLocal: string;
  weekdaysMask: number;
}): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  const preferences = await readNotificationPreferences(options.userId);
  if (!categoryEnabled(preferences, options.entityType)) {
    await cancelEntityReminders(options.userId, options.entityType, options.entityId);
    return [];
  }
  if (await ensureReminderPermission() !== 'granted') throw new Error('notification_permission_denied');
  await cancelEntityReminders(options.userId, options.entityType, options.entityId);

  const [hour = 9, minute = 0] = options.timeLocal.split(':').map(Number);
  const channelId = channelForTime(preferences, options.timeLocal);
  const quiet = channelId === QUIET_CHANNEL_ID;
  const identifiers: string[] = [];
  const content = discreetContent(
    'Você tem um cuidado programado agora.',
    '/(tabs)/care',
    options.entityType,
    quiet,
  );

  if (options.weekdaysMask === 127) {
    identifiers.push(await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId,
      },
    }));
  } else {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if ((options.weekdaysMask & (1 << dayIndex)) === 0) continue;
      identifiers.push(await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: dayIndex + 1,
          hour,
          minute,
          channelId,
        },
      }));
    }
  }

  await replaceNotificationBindings(options.userId, options.entityType, options.entityId, identifiers);
  return identifiers;
}

export async function scheduleAppointmentReminder(
  userId: string,
  appointmentId: string,
  scheduledAt: string,
): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  const preferences = await readNotificationPreferences(userId);
  if (!categoryEnabled(preferences, 'appointment')) {
    await cancelEntityReminders(userId, 'appointment', appointmentId);
    return [];
  }
  if (await ensureReminderPermission() !== 'granted') throw new Error('notification_permission_denied');
  await cancelEntityReminders(userId, 'appointment', appointmentId);

  const reminderAt = new Date(new Date(scheduledAt).getTime() - 60 * 60 * 1000);
  if (reminderAt.getTime() <= Date.now()) return [];
  const timeLocal = timeLocalFromDate(reminderAt);
  const channelId = channelForTime(preferences, timeLocal);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: discreetContent(
      'Você tem um compromisso de cuidado em breve.',
      '/appointments',
      'appointment',
      channelId === QUIET_CHANNEL_ID,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderAt,
      channelId,
    },
  });
  await replaceNotificationBindings(userId, 'appointment', appointmentId, [identifier]);
  return [identifier];
}

export async function scheduleDailyCheckInReminder(
  userId: string,
  preferences?: NotificationPreferences,
): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  const resolved = preferences ?? await readNotificationPreferences(userId);
  await cancelEntityReminders(userId, 'daily_checkin', DAILY_CHECKIN_ENTITY_ID);
  if (!categoryEnabled(resolved, 'daily_checkin')) return [];
  if (await ensureReminderPermission() !== 'granted') throw new Error('notification_permission_denied');

  const [hour = 20, minute = 0] = resolved.dailyCheckInTimeLocal.split(':').map(Number);
  const channelId = channelForTime(resolved, resolved.dailyCheckInTimeLocal);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: discreetContent(
      'Reserve um momento para registrar como você está.',
      '/(tabs)/check-in',
      'daily_checkin',
      channelId === QUIET_CHANNEL_ID,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId,
    },
  });
  await replaceNotificationBindings(userId, 'daily_checkin', DAILY_CHECKIN_ENTITY_ID, [identifier]);
  return [identifier];
}

export async function reconcileCareReminders(userId: string): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const preferences = await readNotificationPreferences(userId);
  if (!preferences.enabled) {
    await cancelAllUserReminders(userId);
    return 0;
  }

  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) return 0;

  const [medications, practices, appointments] = await Promise.all([
    listMedications(userId),
    listCarePractices(userId),
    listAppointments(userId),
  ]);
  let scheduled = 0;

  for (const medication of medications) {
    for (const schedule of medication.schedules) {
      if (!schedule.reminderEnabled || !preferences.categories.medications) {
        await cancelEntityReminders(userId, 'medication_schedule', schedule.id);
        continue;
      }
      if ((await listNotificationBindings(userId, 'medication_schedule', schedule.id)).length) continue;
      await scheduleEntityReminders({
        userId,
        entityType: 'medication_schedule',
        entityId: schedule.id,
        timeLocal: schedule.timeLocal,
        weekdaysMask: schedule.weekdaysMask,
      });
      scheduled += 1;
    }
  }

  for (const practice of practices) {
    if (!practice.reminderEnabled || !practice.timeLocal || !preferences.categories.practices) {
      await cancelEntityReminders(userId, 'care_practice', practice.id);
      continue;
    }
    if ((await listNotificationBindings(userId, 'care_practice', practice.id)).length) continue;
    await scheduleEntityReminders({
      userId,
      entityType: 'care_practice',
      entityId: practice.id,
      timeLocal: practice.timeLocal,
      weekdaysMask: practice.weekdaysMask,
    });
    scheduled += 1;
  }

  for (const appointment of appointments) {
    if (!appointment.reminderEnabled || appointment.status !== 'scheduled' || !preferences.categories.appointments) {
      await cancelEntityReminders(userId, 'appointment', appointment.id);
      continue;
    }
    if ((await listNotificationBindings(userId, 'appointment', appointment.id)).length) continue;
    const ids = await scheduleAppointmentReminder(userId, appointment.id, appointment.scheduledAt);
    if (ids.length) scheduled += 1;
  }

  scheduled += await reconcileRefillReminders(userId, preferences);
  const dailyIds = await scheduleDailyCheckInReminder(userId, preferences);
  if (dailyIds.length) scheduled += 1;
  return scheduled;
}

export async function reconcileRefillReminders(
  userId: string,
  preferences?: NotificationPreferences,
): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const resolved = preferences ?? await readNotificationPreferences(userId);
  if (!categoryEnabled(resolved, 'medication_refill')) return 0;

  const due = await listLowStockMedications(userId);
  let sent = 0;
  for (const medication of due) {
    const lastSent = medication.refillReminderLastSentAt
      ? new Date(medication.refillReminderLastSentAt).getTime()
      : 0;
    if (Date.now() - lastSent < 24 * 60 * 60 * 1000) continue;

    const now = new Date();
    const channelId = channelForTime(resolved, timeLocalFromDate(now));
    const identifier = await Notifications.scheduleNotificationAsync({
      content: discreetContent(
        'Revise um item do seu plano de cuidado.',
        '/medications',
        'medication_refill',
        channelId === QUIET_CHANNEL_ID,
      ),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(now.getTime() + 1000),
        channelId,
      },
    });
    await replaceNotificationBindings(userId, 'medication_refill', medication.id, [identifier]);
    await markRefillReminderSent(userId, medication.id);
    sent += 1;
  }
  return sent;
}

export async function refreshAllUserReminders(userId: string): Promise<number> {
  await cancelAllUserReminders(userId);
  return reconcileCareReminders(userId);
}

export async function cancelAllUserReminders(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const identifiers = await listAllNotificationBindings(userId);
  await Promise.all(identifiers.map(async (identifier) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // A notificação pode ter sido removida pelo sistema.
    }
  }));
  await clearAllNotificationBindings(userId);
}
