import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  appointmentSchema,
  createAppointmentInputSchema,
  createProfessionalInputSchema,
  createTreatmentInputSchema,
  professionalSchema,
  treatmentSchema,
  type Appointment,
  type AppointmentStatus,
  type CreateAppointmentInput,
  type CreateProfessionalInput,
  type CreateTreatmentInput,
  type Professional,
  type Treatment,
  type TreatmentStatus,
} from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import { enqueueSyncRecord } from '@/data/sync-queue-repository';

function mapProfessional(row: Record<string, unknown>): Professional {
  return professionalSchema.parse({
    id: row.id, userId: row.user_id, name: row.name, specialty: row.specialty,
    phone: row.phone, email: row.email, notes: row.notes, active: Boolean(row.active),
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  return appointmentSchema.parse({
    id: row.id, userId: row.user_id, professionalId: row.professional_id,
    title: row.title, scheduledAt: row.scheduled_at, durationMinutes: row.duration_minutes,
    location: row.location, notes: row.notes, status: row.status,
    reminderEnabled: Boolean(row.reminder_enabled), createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

function mapTreatment(row: Record<string, unknown>): Treatment {
  return treatmentSchema.parse({
    id: row.id, userId: row.user_id, professionalId: row.professional_id,
    name: row.name, description: row.description, startDate: row.start_date, endDate: row.end_date,
    status: row.status, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  });
}

async function persistProfessional(db: SQLiteDatabase, record: Professional): Promise<void> {
  await db.runAsync(
    `INSERT INTO professionals (id,user_id,name,specialty,phone,email,notes,active,created_at,updated_at,synced_at,deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,NULL,NULL)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name,specialty=excluded.specialty,phone=excluded.phone,email=excluded.email,
     notes=excluded.notes,active=excluded.active,updated_at=excluded.updated_at,synced_at=NULL,deleted_at=NULL;`,
    record.id, record.userId, record.name, record.specialty, record.phone, record.email,
    record.notes, record.active ? 1 : 0, record.createdAt, record.updatedAt,
  );
  await enqueueSyncRecord(record.userId, 'professional', record.id, record, db);
}

async function persistAppointment(db: SQLiteDatabase, record: Appointment): Promise<void> {
  await db.runAsync(
    `INSERT INTO appointments (id,user_id,professional_id,title,scheduled_at,duration_minutes,location,notes,status,reminder_enabled,created_at,updated_at,synced_at,deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)
     ON CONFLICT(id) DO UPDATE SET professional_id=excluded.professional_id,title=excluded.title,scheduled_at=excluded.scheduled_at,
     duration_minutes=excluded.duration_minutes,location=excluded.location,notes=excluded.notes,status=excluded.status,
     reminder_enabled=excluded.reminder_enabled,updated_at=excluded.updated_at,synced_at=NULL,deleted_at=NULL;`,
    record.id, record.userId, record.professionalId, record.title, record.scheduledAt,
    record.durationMinutes, record.location, record.notes, record.status,
    record.reminderEnabled ? 1 : 0, record.createdAt, record.updatedAt,
  );
  await enqueueSyncRecord(record.userId, 'appointment', record.id, record, db);
}

async function persistTreatment(db: SQLiteDatabase, record: Treatment): Promise<void> {
  await db.runAsync(
    `INSERT INTO treatments (id,user_id,professional_id,name,description,start_date,end_date,status,notes,created_at,updated_at,synced_at,deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)
     ON CONFLICT(id) DO UPDATE SET professional_id=excluded.professional_id,name=excluded.name,description=excluded.description,
     start_date=excluded.start_date,end_date=excluded.end_date,status=excluded.status,notes=excluded.notes,
     updated_at=excluded.updated_at,synced_at=NULL,deleted_at=NULL;`,
    record.id, record.userId, record.professionalId, record.name, record.description,
    record.startDate, record.endDate, record.status, record.notes, record.createdAt, record.updatedAt,
  );
  await enqueueSyncRecord(record.userId, 'treatment', record.id, record, db);
}

export async function saveProfessional(input: CreateProfessionalInput, userId: string): Promise<Professional> {
  const parsed = createProfessionalInputSchema.parse(input);
  const now = new Date().toISOString();
  const record = professionalSchema.parse({ id: Crypto.randomUUID(), userId, ...parsed, active: true, createdAt: now, updatedAt: now });
  const db = await getDatabase();
  await db.withTransactionAsync(async () => persistProfessional(db, record));
  return record;
}

export async function listProfessionals(userId: string, includeInactive = false): Promise<Professional[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM professionals WHERE user_id = ? ${includeInactive ? '' : 'AND active = 1'} AND deleted_at IS NULL ORDER BY name COLLATE NOCASE;`, userId,
  );
  return rows.map(mapProfessional);
}

export async function saveAppointment(input: CreateAppointmentInput, userId: string): Promise<Appointment> {
  const parsed = createAppointmentInputSchema.parse(input);
  const now = new Date().toISOString();
  const record = appointmentSchema.parse({ id: Crypto.randomUUID(), userId, ...parsed, status: 'scheduled', createdAt: now, updatedAt: now });
  const db = await getDatabase();
  await db.withTransactionAsync(async () => persistAppointment(db, record));
  return record;
}

export async function listAppointments(userId: string, options: { includePast?: boolean; limit?: number } = {}): Promise<Appointment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM appointments WHERE user_id = ? AND deleted_at IS NULL ${options.includePast ? '' : "AND (scheduled_at >= ? OR status = 'scheduled')"} ORDER BY scheduled_at ASC LIMIT ?;`,
    ...(options.includePast ? [userId, options.limit ?? 100] : [userId, new Date().toISOString(), options.limit ?? 100]),
  );
  return rows.map(mapAppointment);
}

export async function updateAppointmentStatus(userId: string, appointmentId: string, status: AppointmentStatus): Promise<Appointment> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM appointments WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;', appointmentId, userId);
  if (!row) throw new Error('appointment_not_found');
  const record = appointmentSchema.parse({ ...mapAppointment(row), status, updatedAt: new Date().toISOString() });
  await db.withTransactionAsync(async () => persistAppointment(db, record));
  return record;
}

export async function saveTreatment(input: CreateTreatmentInput, userId: string): Promise<Treatment> {
  const parsed = createTreatmentInputSchema.parse(input);
  if (parsed.endDate && parsed.endDate < parsed.startDate) throw new Error('invalid_treatment_period');
  const now = new Date().toISOString();
  const record = treatmentSchema.parse({ id: Crypto.randomUUID(), userId, ...parsed, createdAt: now, updatedAt: now });
  const db = await getDatabase();
  await db.withTransactionAsync(async () => persistTreatment(db, record));
  return record;
}

export async function listTreatments(userId: string, includeCompleted = false): Promise<Treatment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM treatments WHERE user_id = ? ${includeCompleted ? '' : "AND status <> 'completed'"} AND deleted_at IS NULL ORDER BY start_date DESC;`, userId,
  );
  return rows.map(mapTreatment);
}

export async function updateTreatmentStatus(userId: string, treatmentId: string, status: TreatmentStatus): Promise<Treatment> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM treatments WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;', treatmentId, userId);
  if (!row) throw new Error('treatment_not_found');
  const record = treatmentSchema.parse({ ...mapTreatment(row), status, endDate: status === 'completed' ? (mapTreatment(row).endDate ?? new Date().toISOString().slice(0, 10)) : mapTreatment(row).endDate, updatedAt: new Date().toISOString() });
  await db.withTransactionAsync(async () => persistTreatment(db, record));
  return record;
}

export async function listAppointmentsInRange(userId: string, from: string, to: string): Promise<Appointment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM appointments
     WHERE user_id = ? AND scheduled_at >= ? AND scheduled_at < ? AND deleted_at IS NULL
     ORDER BY scheduled_at ASC;`,
    userId,
    from,
    to,
  );
  return rows.map(mapAppointment);
}
