import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createSupportContactInputSchema,
  saveSupportPlanInputSchema,
  supportContactSchema,
  supportPlanSchema,
  type CreateSupportContactInput,
  type SaveSupportPlanInput,
  type SupportContact,
  type SupportPlan,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import { enqueueSyncRecord } from '@/data/sync-queue-repository';

function parseList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

function mapPlan(row: Record<string, unknown>): SupportPlan {
  return supportPlanSchema.parse({
    id: row.id, userId: row.user_id,
    warningSigns: parseList(row.warning_signs_json),
    immediateActions: parseList(row.immediate_actions_json),
    safePlaces: parseList(row.safe_places_json),
    importantReminder: row.important_reminder,
    groundingReminder: row.grounding_reminder,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

function mapContact(row: Record<string, unknown>): SupportContact {
  return supportContactSchema.parse({
    id: row.id, userId: row.user_id, name: row.name, relationship: row.relationship,
    phone: row.phone, availabilityNotes: row.availability_notes, priority: row.priority,
    active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

async function persistPlan(db: SQLiteDatabase, record: SupportPlan): Promise<void> {
  await db.runAsync(
    `INSERT INTO support_plans (
      id,user_id,warning_signs_json,immediate_actions_json,safe_places_json,
      important_reminder,grounding_reminder,created_at,updated_at,synced_at,deleted_at
    ) VALUES (?,?,?,?,?,?,?,?,?,NULL,NULL)
    ON CONFLICT(user_id) DO UPDATE SET
      id=excluded.id,warning_signs_json=excluded.warning_signs_json,
      immediate_actions_json=excluded.immediate_actions_json,safe_places_json=excluded.safe_places_json,
      important_reminder=excluded.important_reminder,grounding_reminder=excluded.grounding_reminder,
      updated_at=excluded.updated_at,synced_at=NULL,deleted_at=NULL;`,
    record.id, record.userId, JSON.stringify(record.warningSigns), JSON.stringify(record.immediateActions),
    JSON.stringify(record.safePlaces), record.importantReminder, record.groundingReminder,
    record.createdAt, record.updatedAt,
  );
  await enqueueSyncRecord(record.userId, 'support_plan', record.id, record, db);
}

async function persistContact(db: SQLiteDatabase, record: SupportContact): Promise<void> {
  await db.runAsync(
    `INSERT INTO support_contacts (
      id,user_id,name,relationship,phone,availability_notes,priority,active,
      created_at,updated_at,synced_at,deleted_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,NULL)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,relationship=excluded.relationship,
      phone=excluded.phone,availability_notes=excluded.availability_notes,priority=excluded.priority,
      active=excluded.active,updated_at=excluded.updated_at,synced_at=NULL,deleted_at=NULL;`,
    record.id, record.userId, record.name, record.relationship, record.phone,
    record.availabilityNotes, record.priority, record.active ? 1 : 0,
    record.createdAt, record.updatedAt,
  );
  await enqueueSyncRecord(record.userId, 'support_contact', record.id, record, db);
}

export async function getSupportPlan(userId: string): Promise<SupportPlan | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM support_plans WHERE user_id = ? AND deleted_at IS NULL LIMIT 1;', userId,
  );
  return row ? mapPlan(row) : null;
}

export async function saveSupportPlan(input: SaveSupportPlanInput, userId: string): Promise<SupportPlan> {
  const parsed = saveSupportPlanInputSchema.parse(input);
  const existing = await getSupportPlan(userId);
  const now = new Date().toISOString();
  const record = supportPlanSchema.parse({
    id: existing?.id ?? Crypto.randomUUID(), userId, ...parsed,
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  });
  const db = await getDatabase();
  await db.withTransactionAsync(async () => persistPlan(db, record));
  return record;
}

export async function listSupportContacts(userId: string, includeInactive = false): Promise<SupportContact[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM support_contacts WHERE user_id = ? AND deleted_at IS NULL
     ${includeInactive ? '' : 'AND active = 1'} ORDER BY priority, name COLLATE NOCASE;`, userId,
  );
  return rows.map(mapContact);
}

export async function saveSupportContact(input: CreateSupportContactInput, userId: string): Promise<SupportContact> {
  const parsed = createSupportContactInputSchema.parse(input);
  const now = new Date().toISOString();
  const record = supportContactSchema.parse({
    id: Crypto.randomUUID(), userId, ...parsed, active: true, createdAt: now, updatedAt: now,
  });
  const db = await getDatabase();
  await db.withTransactionAsync(async () => persistContact(db, record));
  return record;
}

export async function setSupportContactActive(userId: string, contactId: string, active: boolean): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM support_contacts WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;', contactId, userId,
  );
  if (!row) throw new Error('support_contact_not_found');
  const record = supportContactSchema.parse({ ...mapContact(row), active, updatedAt: new Date().toISOString() });
  await db.withTransactionAsync(async () => persistContact(db, record));
}
