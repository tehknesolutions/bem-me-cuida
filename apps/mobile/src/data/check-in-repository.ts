import * as Crypto from 'expo-crypto';

import { checkInSchema, type CheckIn, type CreateCheckInInput } from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';

function mapRow(row: Record<string, unknown>): CheckIn {
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
    updatedAt: row.updated_at,
  });
}

export async function saveCheckIn(input: CreateCheckInInput, userId: string | null = null): Promise<CheckIn> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const record: CheckIn = checkInSchema.parse({
    ...input,
    id: Crypto.randomUUID(),
    userId,
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO mood_checkins (
        id, user_id, occurred_at, mood, anxiety, energy, irritability, agitation,
        impulsivity, concentration, craving, sleep_quality, sleep_minutes, note,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      record.id,
      record.userId,
      record.occurredAt,
      record.mood,
      record.anxiety,
      record.energy,
      record.irritability,
      record.agitation,
      record.impulsivity,
      record.concentration,
      record.craving,
      record.sleepQuality,
      record.sleepMinutes,
      record.note,
      record.createdAt,
      record.updatedAt,
    );

    if (record.userId) {
      await db.runAsync(
        `INSERT INTO sync_queue (
          id, user_id, entity_type, entity_id, operation, payload, attempt_count,
          available_at, created_at, updated_at
        ) VALUES (?, ?, 'mood_checkin', ?, 'upsert', ?, 0, ?, ?, ?)
        ON CONFLICT(entity_type, entity_id, operation)
        DO UPDATE SET payload = excluded.payload, available_at = excluded.available_at, updated_at = excluded.updated_at;`,
        Crypto.randomUUID(),
        record.userId,
        record.id,
        JSON.stringify(record),
        now,
        now,
        now,
      );
    }
  });

  return record;
}

export async function listRecentCheckIns(userId: string, limit = 7): Promise<CheckIn[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM mood_checkins
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY occurred_at DESC
     LIMIT ?;`,
    userId,
    limit,
  );
  return rows.map(mapRow);
}

export async function listCheckInsInRange(userId: string, from: string, to: string): Promise<CheckIn[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM mood_checkins
     WHERE user_id = ? AND occurred_at >= ? AND occurred_at < ? AND deleted_at IS NULL
     ORDER BY occurred_at DESC;`,
    userId,
    from,
    to,
  );
  return rows.map(mapRow);
}
