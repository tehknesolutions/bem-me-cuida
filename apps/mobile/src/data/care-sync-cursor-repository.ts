import { getDatabase } from '@/data/database';

export type CareSyncCursor = {
  updatedAt: string | null;
  id: string | null;
};

export async function getCareSyncCursor(userId: string, entityType: string): Promise<CareSyncCursor> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ remote_cursor: string | null; remote_cursor_id: string | null }>(
    `SELECT remote_cursor, remote_cursor_id FROM sync_cursors
     WHERE user_id = ? AND entity_type = ?;`,
    userId,
    entityType,
  );
  return { updatedAt: row?.remote_cursor ?? null, id: row?.remote_cursor_id ?? null };
}

export async function saveCareSyncCursor(
  userId: string,
  entityType: string,
  updatedAt: string,
  id: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_cursors (user_id, entity_type, remote_cursor, remote_cursor_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, entity_type) DO UPDATE SET
       remote_cursor = excluded.remote_cursor,
       remote_cursor_id = excluded.remote_cursor_id;`,
    userId,
    entityType,
    updatedAt,
    id,
  );
}

export async function resetCareSyncCursor(userId: string, entityType: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_cursors (user_id, entity_type, remote_cursor, remote_cursor_id)
     VALUES (?, ?, NULL, NULL)
     ON CONFLICT(user_id, entity_type) DO UPDATE SET
       remote_cursor = NULL,
       remote_cursor_id = NULL;`,
    userId,
    entityType,
  );
}
