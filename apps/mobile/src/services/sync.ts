import { checkInSchema, type CheckIn } from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import {
  getLocalSyncState,
  markSyncAttempt,
  markSyncFailure,
  markSyncSuccess,
  resetRemoteCursor,
} from '@/data/sync-state-repository';
import {
  markCareEntitySynced,
  pullAllCareRecords,
  resetCareEntityCursor,
  syncCareQueueItem,
} from '@/services/care-sync';
import { supabase } from '@/services/supabase';
import { MAX_SYNC_ATTEMPTS, nextRetryAt, safeSyncErrorCode } from '@/services/sync-policy';

const PULL_PAGE_SIZE = 500;

type RemoteCheckInRow = {
  id: string;
  user_id: string;
  occurred_at: string;
  mood: CheckIn['mood'];
  anxiety: number;
  energy: number;
  irritability: number;
  agitation: number;
  impulsivity: number;
  concentration: number;
  craving: number;
  sleep_quality: CheckIn['sleepQuality'];
  sleep_minutes: number | null;
  note: string | null;
  client_updated_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SyncCycleResult = {
  pushed: number;
  pulled: number;
  skipped: boolean;
};

function mapRemoteCheckIn(row: RemoteCheckInRow): CheckIn {
  return checkInSchema.parse({
    id: row.id,
    userId: row.user_id,
    occurredAt: row.occurred_at,
    mood: row.mood,
    anxiety: row.anxiety,
    energy: row.energy,
    irritability: row.irritability,
    agitation: row.agitation,
    impulsivity: row.impulsivity,
    concentration: row.concentration,
    craving: row.craving,
    sleepQuality: row.sleep_quality,
    sleepMinutes: row.sleep_minutes,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.client_updated_at,
  });
}

async function syncMoodCheckIn(payload: unknown, activeUserId: string): Promise<'applied' | 'remote_newer'> {
  if (!supabase) throw new Error('supabase_unavailable');
  const checkIn = checkInSchema.parse(payload);
  if (checkIn.userId !== activeUserId) throw new Error('account_scope_mismatch');
  const { data: outcome, error } = await supabase.rpc('sync_mood_checkin', {
    p_record: {
      id: checkIn.id,
      user_id: activeUserId,
      occurred_at: checkIn.occurredAt,
      mood: checkIn.mood,
      anxiety: checkIn.anxiety,
      energy: checkIn.energy,
      irritability: checkIn.irritability,
      agitation: checkIn.agitation,
      impulsivity: checkIn.impulsivity,
      concentration: checkIn.concentration,
      craving: checkIn.craving,
      sleep_quality: checkIn.sleepQuality,
      sleep_minutes: checkIn.sleepMinutes,
      note: checkIn.note,
      client_updated_at: checkIn.updatedAt,
      deleted_at: null,
    },
  });
  if (error) throw new Error(error.code ?? 'remote_upsert_failed');
  if (outcome !== 'applied' && outcome !== 'remote_newer') throw new Error('unexpected_sync_outcome');
  return outcome;
}

export async function flushSyncQueue(userId?: string): Promise<{
  processed: number;
  remoteNewerEntities: string[];
  skipped: boolean;
}> {
  if (!supabase) return { processed: 0, remoteNewerEntities: [], skipped: true };

  const { data: sessionData } = await supabase.auth.getSession();
  const activeUserId = sessionData.session?.user.id;
  if (!activeUserId || (userId && userId !== activeUserId)) {
    return { processed: 0, remoteNewerEntities: [], skipped: true };
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const items = await db.getAllAsync<{
    id: string;
    entity_type: string;
    entity_id: string;
    payload: string;
    attempt_count: number;
  }>(
    `SELECT id, entity_type, entity_id, payload, attempt_count
     FROM sync_queue
     WHERE user_id = ? AND available_at <= ? AND attempt_count < ?
     ORDER BY created_at ASC
     LIMIT 50;`,
    activeUserId,
    now,
    MAX_SYNC_ATTEMPTS,
  );

  let processed = 0;
  const remoteNewerEntities = new Set<string>();
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload) as unknown;
      const outcome = item.entity_type === 'mood_checkin'
        ? await syncMoodCheckIn(payload, activeUserId)
        : await syncCareQueueItem(item.entity_type, payload, activeUserId);
      if (outcome === 'remote_newer') remoteNewerEntities.add(item.entity_type);

      await db.runAsync('DELETE FROM sync_queue WHERE id = ?;', item.id);
      if (item.entity_type === 'mood_checkin') {
        await db.runAsync('UPDATE mood_checkins SET synced_at = ? WHERE id = ?;', new Date().toISOString(), item.entity_id);
      } else {
        await markCareEntitySynced(item.entity_type, item.entity_id, activeUserId);
      }
      processed += 1;
    } catch (error) {
      const attempts = item.attempt_count + 1;
      await db.runAsync(
        `UPDATE sync_queue
         SET attempt_count = ?, available_at = ?, last_error_code = ?, updated_at = ?
         WHERE id = ?;`,
        attempts,
        nextRetryAt(attempts),
        safeSyncErrorCode(error),
        new Date().toISOString(),
        item.id,
      );
    }
  }

  return { processed, remoteNewerEntities: [...remoteNewerEntities], skipped: false };
}

async function upsertRemoteCheckIn(row: RemoteCheckInRow): Promise<boolean> {
  const db = await getDatabase();
  const pending = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM sync_queue
     WHERE user_id = ? AND entity_type = 'mood_checkin' AND entity_id = ?
     LIMIT 1;`,
    row.user_id,
    row.id,
  );
  if (pending) return false;

  if (row.deleted_at) {
    await db.runAsync(
      `UPDATE mood_checkins
       SET deleted_at = ?, synced_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?;`,
      row.deleted_at,
      new Date().toISOString(),
      row.client_updated_at,
      row.id,
      row.user_id,
    );
    return true;
  }

  const checkIn = mapRemoteCheckIn(row);
  await db.runAsync(
    `INSERT INTO mood_checkins (
      id, user_id, occurred_at, mood, anxiety, energy, irritability, agitation,
      impulsivity, concentration, craving, sleep_quality, sleep_minutes, note,
      created_at, updated_at, synced_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      occurred_at = excluded.occurred_at,
      mood = excluded.mood,
      anxiety = excluded.anxiety,
      energy = excluded.energy,
      irritability = excluded.irritability,
      agitation = excluded.agitation,
      impulsivity = excluded.impulsivity,
      concentration = excluded.concentration,
      craving = excluded.craving,
      sleep_quality = excluded.sleep_quality,
      sleep_minutes = excluded.sleep_minutes,
      note = excluded.note,
      updated_at = excluded.updated_at,
      synced_at = excluded.synced_at,
      deleted_at = NULL
    WHERE excluded.updated_at >= mood_checkins.updated_at;`,
    checkIn.id,
    checkIn.userId,
    checkIn.occurredAt,
    checkIn.mood,
    checkIn.anxiety,
    checkIn.energy,
    checkIn.irritability,
    checkIn.agitation,
    checkIn.impulsivity,
    checkIn.concentration,
    checkIn.craving,
    checkIn.sleepQuality,
    checkIn.sleepMinutes,
    checkIn.note,
    checkIn.createdAt,
    checkIn.updatedAt,
    new Date().toISOString(),
  );
  return true;
}

export async function pullRemoteCheckIns(userId: string): Promise<number> {
  if (!supabase) return 0;
  const state = await getLocalSyncState(userId);
  let cursor = state.remoteCursor ?? '1970-01-01T00:00:00.000Z';
  let cursorId = state.remoteCursorId ?? '00000000-0000-0000-0000-000000000000';
  let pulled = 0;

  while (true) {
    const { data, error } = await supabase.rpc('pull_mood_checkins', {
      p_cursor_updated_at: cursor,
      p_cursor_id: cursorId,
      p_limit: PULL_PAGE_SIZE,
    });

    if (error) throw new Error(error.code ?? 'remote_pull_failed');
    const rows = (data ?? []) as RemoteCheckInRow[];
    if (!rows.length) break;

    let pageCursor = cursor;
    let pageCursorId = cursorId;
    let blockedByPendingLocalChange = false;
    for (const row of rows) {
      if (row.user_id !== userId) throw new Error('account_scope_mismatch');
      const applied = await upsertRemoteCheckIn(row);
      if (!applied) {
        blockedByPendingLocalChange = true;
        break;
      }
      pulled += 1;
      pageCursor = row.updated_at;
      pageCursorId = row.id;
    }

    if (pageCursor !== cursor || pageCursorId !== cursorId) {
      cursor = pageCursor;
      cursorId = pageCursorId;
      await markSyncSuccess(userId, cursor, cursorId);
    }
    if (blockedByPendingLocalChange || rows.length < PULL_PAGE_SIZE) break;
  }

  return pulled;
}

export async function runSyncCycle(userId: string): Promise<SyncCycleResult> {
  if (!supabase) return { pushed: 0, pulled: 0, skipped: true };
  await markSyncAttempt(userId);

  try {
    const pushed = await flushSyncQueue(userId);
    if (pushed.skipped) return { pushed: 0, pulled: 0, skipped: true };
    for (const entityType of pushed.remoteNewerEntities) {
      if (entityType === 'mood_checkin') await resetRemoteCursor(userId);
      else await resetCareEntityCursor(userId, entityType);
    }
    const [moodPulled, carePulled] = await Promise.all([
      pullRemoteCheckIns(userId),
      pullAllCareRecords(userId),
    ]);
    await markSyncSuccess(userId);
    return { pushed: pushed.processed, pulled: moodPulled + carePulled, skipped: false };
  } catch (error) {
    await markSyncFailure(userId, safeSyncErrorCode(error));
    throw error;
  }
}
