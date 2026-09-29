import { getDatabase } from '@/data/database';

export type LocalSyncState = {
  pending: number;
  blocked: number;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  remoteCursor: string | null;
  remoteCursorId: string | null;
};

export async function getLocalSyncState(userId: string): Promise<LocalSyncState> {
  const db = await getDatabase();
  const queue = await db.getFirstAsync<{ pending: number; blocked: number }>(
    `SELECT
       SUM(CASE WHEN attempt_count < 8 THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN attempt_count >= 8 THEN 1 ELSE 0 END) AS blocked
     FROM sync_queue
     WHERE user_id = ?;`,
    userId,
  );
  const state = await db.getFirstAsync<{
    remote_cursor: string | null;
    remote_cursor_id: string | null;
    last_success_at: string | null;
    last_attempt_at: string | null;
    last_error_code: string | null;
  }>('SELECT remote_cursor, remote_cursor_id, last_success_at, last_attempt_at, last_error_code FROM sync_state WHERE user_id = ?;', userId);

  return {
    pending: Number(queue?.pending ?? 0),
    blocked: Number(queue?.blocked ?? 0),
    lastSuccessAt: state?.last_success_at ?? null,
    lastAttemptAt: state?.last_attempt_at ?? null,
    lastErrorCode: state?.last_error_code ?? null,
    remoteCursor: state?.remote_cursor ?? null,
    remoteCursorId: state?.remote_cursor_id ?? null,
  };
}

export async function markSyncAttempt(userId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_state (user_id, last_attempt_at)
     VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET last_attempt_at = excluded.last_attempt_at;`,
    userId,
    now,
  );
}

export async function markSyncSuccess(
  userId: string,
  remoteCursor?: string | null,
  remoteCursorId?: string | null,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_state (user_id, remote_cursor, remote_cursor_id, last_success_at, last_attempt_at, last_error_code)
     VALUES (?, ?, ?, ?, ?, NULL)
     ON CONFLICT(user_id) DO UPDATE SET
       remote_cursor = COALESCE(excluded.remote_cursor, sync_state.remote_cursor),
       remote_cursor_id = CASE
         WHEN excluded.remote_cursor IS NULL THEN sync_state.remote_cursor_id
         ELSE excluded.remote_cursor_id
       END,
       last_success_at = excluded.last_success_at,
       last_attempt_at = excluded.last_attempt_at,
       last_error_code = NULL;`,
    userId,
    remoteCursor ?? null,
    remoteCursorId ?? null,
    now,
    now,
  );
}

export async function resetRemoteCursor(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (user_id, remote_cursor, remote_cursor_id)
     VALUES (?, NULL, NULL)
     ON CONFLICT(user_id) DO UPDATE SET
       remote_cursor = NULL,
       remote_cursor_id = NULL;`,
    userId,
  );
}

export async function markSyncFailure(userId: string, errorCode: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_state (user_id, last_attempt_at, last_error_code)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       last_attempt_at = excluded.last_attempt_at,
       last_error_code = excluded.last_error_code;`,
    userId,
    now,
    errorCode,
  );
}
