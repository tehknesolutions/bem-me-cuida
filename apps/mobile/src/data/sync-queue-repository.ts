import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/data/database';

export async function enqueueSyncRecord(
  userId: string,
  entityType: string,
  entityId: string,
  payload: unknown,
  database?: SQLiteDatabase,
): Promise<void> {
  const db = database ?? await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_queue (
      id, user_id, entity_type, entity_id, operation, payload, attempt_count,
      available_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'upsert', ?, 0, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id, operation)
    DO UPDATE SET
      user_id = excluded.user_id,
      payload = excluded.payload,
      attempt_count = 0,
      available_at = excluded.available_at,
      last_error_code = NULL,
      updated_at = excluded.updated_at;`,
    Crypto.randomUUID(),
    userId,
    entityType,
    entityId,
    JSON.stringify(payload),
    now,
    now,
    now,
  );
}
