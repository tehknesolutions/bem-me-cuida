import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/data/database';

export type ReminderEntityType = 'medication_schedule' | 'care_practice' | 'appointment' | 'medication_refill' | 'daily_checkin';

export async function replaceNotificationBindings(
  userId: string,
  entityType: ReminderEntityType,
  entityId: string,
  notificationIds: string[],
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM local_notification_bindings WHERE user_id = ? AND entity_type = ? AND entity_id = ?;',
      userId,
      entityType,
      entityId,
    );
    for (const notificationId of notificationIds) {
      await db.runAsync(
        `INSERT INTO local_notification_bindings (
          id, user_id, entity_type, entity_id, notification_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        Crypto.randomUUID(),
        userId,
        entityType,
        entityId,
        notificationId,
        now,
      );
    }
  });
}

export async function listNotificationBindings(
  userId: string,
  entityType: ReminderEntityType,
  entityId: string,
): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ notification_id: string }>(
    `SELECT notification_id FROM local_notification_bindings
     WHERE user_id = ? AND entity_type = ? AND entity_id = ?;`,
    userId,
    entityType,
    entityId,
  );
  return rows.map((row) => row.notification_id);
}

export async function listAllNotificationBindings(userId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ notification_id: string }>(
    'SELECT notification_id FROM local_notification_bindings WHERE user_id = ?;',
    userId,
  );
  return rows.map((row) => row.notification_id);
}

export async function clearAllNotificationBindings(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM local_notification_bindings WHERE user_id = ?;', userId);
}
