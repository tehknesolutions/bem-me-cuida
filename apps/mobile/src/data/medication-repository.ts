import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createMedicationInputSchema,
  medicationIntakeSchema,
  medicationScheduleSchema,
  medicationSchema,
  updateMedicationInputSchema,
  type CreateMedicationInput,
  type Medication,
  type MedicationIntake,
  type MedicationIntakeStatus,
  type MedicationSchedule,
  type MedicationScheduleInput,
  type UpdateMedicationInput,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import { enqueueSyncRecord } from '@/data/sync-queue-repository';
import { dateAtLocalTime, endOfLocalDay, formatLocalDate, maskIncludesDate, startOfLocalDay } from '@/services/care-time';
import { nextStockQuantity, stockDeltaForIntakeTransition } from '@/services/stock-policy';

export type MedicationWithSchedules = Medication & { schedules: MedicationSchedule[] };
export type TodayMedicationDose = { medication: Medication; schedule: MedicationSchedule; plannedAt: string; intake: MedicationIntake | null };

function mapMedication(row: Record<string, unknown>): Medication {
  return medicationSchema.parse({
    id: row.id, userId: row.user_id, name: row.name, dosageText: row.dosage_text,
    instructions: row.instructions, prescriber: row.prescriber, startDate: row.start_date,
    endDate: row.end_date, active: Boolean(row.active),
    stockTrackingEnabled: Boolean(row.stock_tracking_enabled),
    stockQuantity: row.stock_quantity === null || row.stock_quantity === undefined ? null : Number(row.stock_quantity),
    unitsPerIntake: row.units_per_intake === null || row.units_per_intake === undefined ? null : Number(row.units_per_intake),
    refillThreshold: row.refill_threshold === null || row.refill_threshold === undefined ? null : Number(row.refill_threshold),
    refillReminderEnabled: Boolean(row.refill_reminder_enabled),
    refillReminderLastSentAt: row.refill_reminder_last_sent_at ?? null,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

function mapSchedule(row: Record<string, unknown>): MedicationSchedule {
  return medicationScheduleSchema.parse({
    id: row.id, userId: row.user_id, medicationId: row.medication_id,
    timeLocal: String(row.time_local).slice(0, 5), weekdaysMask: row.weekdays_mask,
    reminderEnabled: Boolean(row.reminder_enabled), active: Boolean(row.active),
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

function mapIntake(row: Record<string, unknown>): MedicationIntake {
  return medicationIntakeSchema.parse({
    id: row.id, userId: row.user_id, medicationId: row.medication_id, scheduleId: row.schedule_id,
    plannedAt: row.planned_at, occurredAt: row.occurred_at, status: row.status, note: row.note,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

function buildMedication(input: CreateMedicationInput, userId: string, id: string, createdAt: string, updatedAt: string, active = true): Medication {
  return medicationSchema.parse({
    id, userId, name: input.name, dosageText: input.dosageText, instructions: input.instructions,
    prescriber: input.prescriber, startDate: input.startDate, endDate: input.endDate, active,
    stockTrackingEnabled: input.stockTrackingEnabled,
    stockQuantity: input.stockTrackingEnabled ? input.stockQuantity : null,
    unitsPerIntake: input.stockTrackingEnabled ? input.unitsPerIntake : null,
    refillThreshold: input.stockTrackingEnabled ? input.refillThreshold : null,
    refillReminderEnabled: input.stockTrackingEnabled && input.refillReminderEnabled,
    refillReminderLastSentAt: null, createdAt, updatedAt,
  });
}

function buildSchedule(input: MedicationScheduleInput, userId: string, medicationId: string, now: string, existing?: MedicationSchedule): MedicationSchedule {
  return medicationScheduleSchema.parse({
    id: input.id ?? existing?.id ?? Crypto.randomUUID(), userId, medicationId,
    timeLocal: input.timeLocal, weekdaysMask: input.weekdaysMask,
    reminderEnabled: input.reminderEnabled, active: true,
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  });
}

async function persistMedication(db: SQLiteDatabase, medication: Medication): Promise<void> {
  await db.runAsync(
    `INSERT INTO medications (
      id, user_id, name, dosage_text, instructions, prescriber, start_date, end_date,
      active, stock_tracking_enabled, stock_quantity, units_per_intake, refill_threshold,
      refill_reminder_enabled, refill_reminder_last_sent_at, created_at, updated_at, synced_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, dosage_text = excluded.dosage_text, instructions = excluded.instructions,
      prescriber = excluded.prescriber, start_date = excluded.start_date, end_date = excluded.end_date,
      active = excluded.active, stock_tracking_enabled = excluded.stock_tracking_enabled,
      stock_quantity = excluded.stock_quantity, units_per_intake = excluded.units_per_intake,
      refill_threshold = excluded.refill_threshold, refill_reminder_enabled = excluded.refill_reminder_enabled,
      refill_reminder_last_sent_at = excluded.refill_reminder_last_sent_at,
      updated_at = excluded.updated_at, synced_at = NULL, deleted_at = NULL;`,
    medication.id, medication.userId, medication.name, medication.dosageText, medication.instructions,
    medication.prescriber, medication.startDate, medication.endDate, medication.active ? 1 : 0,
    medication.stockTrackingEnabled ? 1 : 0, medication.stockQuantity, medication.unitsPerIntake,
    medication.refillThreshold, medication.refillReminderEnabled ? 1 : 0,
    medication.refillReminderLastSentAt, medication.createdAt, medication.updatedAt,
  );
  await enqueueSyncRecord(medication.userId, 'medication', medication.id, medication, db);
}

async function persistSchedule(db: SQLiteDatabase, schedule: MedicationSchedule): Promise<void> {
  await db.runAsync(
    `INSERT INTO medication_schedules (
      id, user_id, medication_id, time_local, weekdays_mask, reminder_enabled,
      active, created_at, updated_at, synced_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
    ON CONFLICT(id) DO UPDATE SET
      time_local = excluded.time_local, weekdays_mask = excluded.weekdays_mask,
      reminder_enabled = excluded.reminder_enabled, active = excluded.active,
      updated_at = excluded.updated_at, synced_at = NULL, deleted_at = NULL;`,
    schedule.id, schedule.userId, schedule.medicationId, schedule.timeLocal,
    schedule.weekdaysMask, schedule.reminderEnabled ? 1 : 0, schedule.active ? 1 : 0,
    schedule.createdAt, schedule.updatedAt,
  );
  await enqueueSyncRecord(schedule.userId, 'medication_schedule', schedule.id, schedule, db);
}

export async function saveMedicationWithSchedule(input: CreateMedicationInput, userId: string): Promise<{ medication: Medication; schedules: MedicationSchedule[] }> {
  const parsed = createMedicationInputSchema.parse(input);
  const db = await getDatabase();
  const now = new Date().toISOString();
  const medication = buildMedication(parsed, userId, Crypto.randomUUID(), now, now);
  const schedules = parsed.schedules.map((schedule) => buildSchedule(schedule, userId, medication.id, now));
  await db.withTransactionAsync(async () => {
    await persistMedication(db, medication);
    for (const schedule of schedules) await persistSchedule(db, schedule);
  });
  return { medication, schedules };
}

export async function getMedication(userId: string, medicationId: string): Promise<MedicationWithSchedules | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM medications WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;', medicationId, userId,
  );
  if (!row) return null;
  const schedules = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM medication_schedules WHERE medication_id = ? AND user_id = ? AND active = 1 AND deleted_at IS NULL ORDER BY time_local;',
    medicationId, userId,
  );
  return { ...mapMedication(row), schedules: schedules.map(mapSchedule) };
}

export async function updateMedication(input: UpdateMedicationInput, userId: string): Promise<MedicationWithSchedules> {
  const parsed = updateMedicationInputSchema.parse(input);
  const current = await getMedication(userId, parsed.id);
  if (!current) throw new Error('medication_not_found');
  const db = await getDatabase();
  const now = new Date().toISOString();
  const medication = buildMedication(parsed, userId, current.id, current.createdAt, now, parsed.active);
  medication.refillReminderLastSentAt = parsed.stockQuantity !== current.stockQuantity ? null : current.refillReminderLastSentAt;
  const byId = new Map(current.schedules.map((item) => [item.id, item]));
  const schedules = parsed.schedules.map((schedule) => ({ ...buildSchedule(schedule, userId, medication.id, now, schedule.id ? byId.get(schedule.id) : undefined), active: parsed.active }));
  const suppliedIds = new Set(schedules.map((item) => item.id));
  const deactivated = current.schedules.filter((item) => !suppliedIds.has(item.id)).map((item) => ({ ...item, active: false, updatedAt: now }));

  await db.withTransactionAsync(async () => {
    await persistMedication(db, medication);
    for (const schedule of schedules) await persistSchedule(db, schedule);
    for (const schedule of deactivated) await persistSchedule(db, schedule);
  });
  return { ...medication, schedules };
}

export async function deactivateMedication(userId: string, medicationId: string): Promise<void> {
  const current = await getMedication(userId, medicationId);
  if (!current) return;
  await updateMedication({
    id: current.id, active: false, name: current.name, dosageText: current.dosageText,
    instructions: current.instructions, prescriber: current.prescriber, startDate: current.startDate,
    endDate: current.endDate, schedules: current.schedules.map(({ id, timeLocal, weekdaysMask, reminderEnabled }) => ({ id, timeLocal, weekdaysMask, reminderEnabled })),
    stockTrackingEnabled: current.stockTrackingEnabled, stockQuantity: current.stockQuantity,
    unitsPerIntake: current.unitsPerIntake, refillThreshold: current.refillThreshold,
    refillReminderEnabled: current.refillReminderEnabled,
  }, userId);
}

export async function listMedications(userId: string, includeInactive = false): Promise<MedicationWithSchedules[]> {
  const db = await getDatabase();
  const medicationRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medications WHERE user_id = ? ${includeInactive ? '' : 'AND active = 1'} AND deleted_at IS NULL ORDER BY name COLLATE NOCASE;`, userId,
  );
  const scheduleRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medication_schedules WHERE user_id = ? ${includeInactive ? '' : 'AND active = 1'} AND deleted_at IS NULL ORDER BY time_local;`, userId,
  );
  const schedules = scheduleRows.map(mapSchedule);
  return medicationRows.map((row) => {
    const medication = mapMedication(row);
    return { ...medication, schedules: schedules.filter((schedule) => schedule.medicationId === medication.id) };
  });
}

export async function listLowStockMedications(userId: string): Promise<MedicationWithSchedules[]> {
  const items = await listMedications(userId);
  return items.filter((item) => item.stockTrackingEnabled && item.refillReminderEnabled && item.stockQuantity !== null && item.refillThreshold !== null && item.stockQuantity <= item.refillThreshold);
}

export async function refillMedicationStock(userId: string, medicationId: string, quantity: number): Promise<Medication> {
  const current = await getMedication(userId, medicationId);
  if (!current) throw new Error('medication_not_found');
  const db = await getDatabase();
  const medication = medicationSchema.parse({ ...current, stockQuantity: Math.max(0, quantity), refillReminderLastSentAt: null, updatedAt: new Date().toISOString() });
  await db.withTransactionAsync(async () => persistMedication(db, medication));
  return medication;
}

export async function markRefillReminderSent(userId: string, medicationId: string, sentAt = new Date().toISOString()): Promise<void> {
  const current = await getMedication(userId, medicationId);
  if (!current) return;
  const db = await getDatabase();
  const medication = medicationSchema.parse({ ...current, refillReminderLastSentAt: sentAt, updatedAt: sentAt });
  await db.withTransactionAsync(async () => persistMedication(db, medication));
}

export async function listTodayMedicationDoses(userId: string, date = new Date()): Promise<TodayMedicationDose[]> {
  const medications = await listMedications(userId);
  const db = await getDatabase();
  const intakeRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM medication_intakes WHERE user_id = ? AND planned_at BETWEEN ? AND ? AND deleted_at IS NULL;',
    userId, startOfLocalDay(date).toISOString(), endOfLocalDay(date).toISOString(),
  );
  const intakes = intakeRows.map(mapIntake);
  const dateKey = formatLocalDate(date);
  return medications
    .filter((medication) => medication.startDate <= dateKey && (!medication.endDate || medication.endDate >= dateKey))
    .flatMap((medication) => medication.schedules.filter((schedule) => schedule.active && maskIncludesDate(schedule.weekdaysMask, date)).map((schedule) => {
      const plannedAt = dateAtLocalTime(date, schedule.timeLocal).toISOString();
      return { medication, schedule, plannedAt, intake: intakes.find((item) => item.medicationId === medication.id && item.scheduleId === schedule.id && item.plannedAt === plannedAt) ?? null };
    })).sort((a, b) => a.plannedAt.localeCompare(b.plannedAt));
}

export async function recordMedicationIntake(dose: Pick<TodayMedicationDose, 'medication' | 'schedule' | 'plannedAt'>, status: MedicationIntakeStatus, userId: string): Promise<MedicationIntake> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM medication_intakes WHERE user_id = ? AND medication_id = ? AND schedule_id = ? AND planned_at = ? LIMIT 1;',
    userId, dose.medication.id, dose.schedule.id, dose.plannedAt,
  );
  const previousStatus = existing?.status === 'taken' || existing?.status === 'skipped' ? existing.status : null;
  const now = new Date().toISOString();
  const intake = medicationIntakeSchema.parse({
    id: existing?.id ?? Crypto.randomUUID(), userId, medicationId: dose.medication.id,
    scheduleId: dose.schedule.id, plannedAt: dose.plannedAt, occurredAt: status === 'taken' ? now : null,
    status, note: existing?.note ?? null, createdAt: existing?.created_at ?? now, updatedAt: now,
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO medication_intakes (id,user_id,medication_id,schedule_id,planned_at,occurred_at,status,note,created_at,updated_at,synced_at,deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,NULL,NULL)
       ON CONFLICT(user_id, medication_id, schedule_id, planned_at) DO UPDATE SET
       occurred_at=excluded.occurred_at,status=excluded.status,note=excluded.note,updated_at=excluded.updated_at,synced_at=NULL,deleted_at=NULL;`,
      intake.id, userId, intake.medicationId, intake.scheduleId, intake.plannedAt, intake.occurredAt,
      intake.status, intake.note, intake.createdAt, intake.updatedAt,
    );
    await enqueueSyncRecord(userId, 'medication_intake', intake.id, intake, db);

    const currentRow = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM medications WHERE id = ? AND user_id = ? LIMIT 1;', dose.medication.id, userId);
    if (currentRow) {
      const current = mapMedication(currentRow);
      if (current.stockTrackingEnabled && current.stockQuantity !== null && current.unitsPerIntake !== null) {
        const delta = stockDeltaForIntakeTransition(previousStatus, status, current.unitsPerIntake);
        if (delta !== 0) {
          const medication = medicationSchema.parse({ ...current, stockQuantity: nextStockQuantity(current.stockQuantity, delta), updatedAt: now });
          await persistMedication(db, medication);
        }
      }
    }
  });
  return intake;
}

export async function listRecentMedicationIntakes(userId: string, limit = 30): Promise<MedicationIntake[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM medication_intakes WHERE user_id = ? AND deleted_at IS NULL ORDER BY planned_at DESC LIMIT ?;', userId, limit,
  );
  return rows.map(mapIntake);
}

export async function listMedicationIntakesInRange(userId: string, from: string, to: string): Promise<MedicationIntake[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medication_intakes
     WHERE user_id = ? AND planned_at >= ? AND planned_at < ? AND deleted_at IS NULL
     ORDER BY planned_at DESC;`,
    userId,
    from,
    to,
  );
  return rows.map(mapIntake);
}
