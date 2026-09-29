import * as Crypto from 'expo-crypto';

import {
  createJournalEntryInputSchema,
  journalEntrySchema,
  updateJournalEntryInputSchema,
  type CreateJournalEntryInput,
  type JournalEmotion,
  type JournalEntry,
  type UpdateJournalEntryInput,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';

export type JournalEntryFilters = {
  query?: string;
  emotion?: JournalEmotion | null;
  forTherapy?: boolean | null;
  since?: string | null;
  until?: string | null;
  limit?: number;
};

function parseStringList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapRow(row: Record<string, unknown>): JournalEntry {
  return journalEntrySchema.parse({
    id: row.id,
    userId: row.user_id,
    occurredAt: row.occurred_at,
    title: row.title,
    body: row.body,
    emotions: parseStringList(row.emotions_json),
    intensity: row.intensity,
    triggers: parseStringList(row.triggers_json),
    strategies: parseStringList(row.strategies_json),
    forTherapy: Boolean(row.for_therapy),
    linkedCheckInId: row.linked_checkin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}

async function enqueueJournalEntry(
  record: JournalEntry,
  operation: 'upsert' | 'delete',
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `DELETE FROM sync_queue
     WHERE user_id = ? AND entity_type = 'journal_entry' AND entity_id = ?;`,
    record.userId,
    record.id,
  );
  await db.runAsync(
    `INSERT INTO sync_queue (
      id, user_id, entity_type, entity_id, operation, payload, attempt_count,
      available_at, created_at, updated_at
    ) VALUES (?, ?, 'journal_entry', ?, ?, ?, 0, ?, ?, ?);`,
    Crypto.randomUUID(),
    record.userId,
    record.id,
    operation,
    JSON.stringify(record),
    now,
    now,
    now,
  );
}

export async function saveJournalEntry(input: CreateJournalEntryInput, userId: string): Promise<JournalEntry> {
  const parsed = createJournalEntryInputSchema.parse(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const record = journalEntrySchema.parse({
    ...parsed,
    id: Crypto.randomUUID(),
    userId,
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO journal_entries (
        id, user_id, occurred_at, title, body, emotions_json, intensity,
        triggers_json, strategies_json, for_therapy, linked_checkin_id,
        created_at, updated_at, synced_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL);`,
      record.id,
      record.userId,
      record.occurredAt,
      record.title,
      record.body,
      JSON.stringify(record.emotions),
      record.intensity,
      JSON.stringify(record.triggers),
      JSON.stringify(record.strategies),
      record.forTherapy ? 1 : 0,
      record.linkedCheckInId,
      record.createdAt,
      record.updatedAt,
    );
    await enqueueJournalEntry(record, 'upsert');
  });

  return record;
}

export async function getJournalEntry(userId: string, id: string): Promise<JournalEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM journal_entries
     WHERE user_id = ? AND id = ? AND deleted_at IS NULL
     LIMIT 1;`,
    userId,
    id,
  );
  return row ? mapRow(row) : null;
}

export async function updateJournalEntry(input: UpdateJournalEntryInput, userId: string): Promise<JournalEntry> {
  const parsed = updateJournalEntryInputSchema.parse(input);
  const existing = await getJournalEntry(userId, parsed.id);
  if (!existing) throw new Error('journal_entry_not_found');

  const now = new Date().toISOString();
  const record = journalEntrySchema.parse({
    ...existing,
    ...parsed,
    userId,
    updatedAt: now,
    deletedAt: null,
  });
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE journal_entries SET
        title = ?, body = ?, emotions_json = ?, intensity = ?, triggers_json = ?,
        strategies_json = ?, for_therapy = ?, linked_checkin_id = ?,
        updated_at = ?, synced_at = NULL, deleted_at = NULL
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL;`,
      record.title,
      record.body,
      JSON.stringify(record.emotions),
      record.intensity,
      JSON.stringify(record.triggers),
      JSON.stringify(record.strategies),
      record.forTherapy ? 1 : 0,
      record.linkedCheckInId,
      record.updatedAt,
      record.id,
      userId,
    );
    await enqueueJournalEntry(record, 'upsert');
  });

  return record;
}

export async function deleteJournalEntry(userId: string, id: string): Promise<void> {
  const existing = await getJournalEntry(userId, id);
  if (!existing) return;
  const deletedAt = new Date().toISOString();
  const tombstone = journalEntrySchema.parse({
    ...existing,
    updatedAt: deletedAt,
    deletedAt,
  });
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE journal_entries
       SET deleted_at = ?, updated_at = ?, synced_at = NULL
       WHERE id = ? AND user_id = ?;`,
      deletedAt,
      deletedAt,
      id,
      userId,
    );
    await enqueueJournalEntry(tombstone, 'delete');
  });
}

export async function listJournalEntries(
  userId: string,
  filters: JournalEntryFilters = {},
): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const conditions = ['user_id = ?', 'deleted_at IS NULL'];
  const parameters: Array<string | number> = [userId];
  const query = filters.query?.trim().toLocaleLowerCase('pt-BR');

  if (query) {
    const term = `%${query}%`;
    conditions.push(`(
      lower(coalesce(title, '')) LIKE ? OR lower(body) LIKE ? OR
      lower(triggers_json) LIKE ? OR lower(strategies_json) LIKE ?
    )`);
    parameters.push(term, term, term, term);
  }
  if (filters.emotion) {
    conditions.push('emotions_json LIKE ?');
    parameters.push(`%"${filters.emotion}"%`);
  }
  if (filters.forTherapy !== undefined && filters.forTherapy !== null) {
    conditions.push('for_therapy = ?');
    parameters.push(filters.forTherapy ? 1 : 0);
  }
  if (filters.since) {
    conditions.push('occurred_at >= ?');
    parameters.push(filters.since);
  }
  if (filters.until) {
    conditions.push('occurred_at < ?');
    parameters.push(filters.until);
  }

  const limit = Math.max(1, Math.min(filters.limit ?? 100, 500));
  parameters.push(limit);
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM journal_entries
     WHERE ${conditions.join(' AND ')}
     ORDER BY occurred_at DESC
     LIMIT ?;`,
    ...parameters,
  );
  return rows.map(mapRow);
}

export async function listRecentJournalEntries(userId: string, limit = 20): Promise<JournalEntry[]> {
  return listJournalEntries(userId, { limit });
}

export async function listJournalEntriesSince(userId: string, since: string): Promise<JournalEntry[]> {
  return listJournalEntries(userId, { since, limit: 500 });
}
