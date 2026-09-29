import type { SQLiteDatabase } from 'expo-sqlite';

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mood_checkins (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        occurred_at TEXT NOT NULL,
        mood TEXT NOT NULL CHECK (mood IN ('very_low','low','neutral','good','very_good')),
        anxiety INTEGER NOT NULL CHECK (anxiety BETWEEN 0 AND 10),
        energy INTEGER NOT NULL CHECK (energy BETWEEN 0 AND 10),
        irritability INTEGER NOT NULL CHECK (irritability BETWEEN 0 AND 10),
        agitation INTEGER NOT NULL CHECK (agitation BETWEEN 0 AND 10),
        impulsivity INTEGER NOT NULL CHECK (impulsivity BETWEEN 0 AND 10),
        concentration INTEGER NOT NULL CHECK (concentration BETWEEN 0 AND 10),
        craving INTEGER NOT NULL CHECK (craving BETWEEN 0 AND 10),
        sleep_quality TEXT NOT NULL CHECK (sleep_quality IN ('poor','partial','good')),
        sleep_minutes INTEGER,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_mood_checkins_occurred_at
        ON mood_checkins(occurred_at DESC);

      CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_occurred_at
        ON mood_checkins(user_id, occurred_at DESC);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('upsert','delete')),
        payload TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        available_at TEXT NOT NULL,
        last_error_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(entity_type, entity_id, operation)
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_available_at
        ON sync_queue(available_at, attempt_count);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_occurred_at
        ON mood_checkins(user_id, occurred_at DESC);
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE sync_queue ADD COLUMN user_id TEXT;
      UPDATE sync_queue
      SET user_id = json_extract(payload, '$.userId')
      WHERE user_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_sync_queue_user_available_at
        ON sync_queue(user_id, available_at, attempt_count);
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS sync_state (
        user_id TEXT PRIMARY KEY NOT NULL,
        remote_cursor TEXT,
        last_success_at TEXT,
        last_attempt_at TEXT,
        last_error_code TEXT
      );
    `,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE sync_state ADD COLUMN remote_cursor_id TEXT;
    `,
  },
  {
    version: 6,
    sql: `
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        dosage_text TEXT NOT NULL CHECK (length(dosage_text) BETWEEN 1 AND 80),
        instructions TEXT CHECK (instructions IS NULL OR length(instructions) <= 300),
        prescriber TEXT CHECK (prescriber IS NULL OR length(prescriber) <= 120),
        start_date TEXT NOT NULL,
        end_date TEXT,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_medications_user_active
        ON medications(user_id, active, name);

      CREATE TABLE IF NOT EXISTS medication_schedules (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        medication_id TEXT NOT NULL,
        time_local TEXT NOT NULL CHECK (
          time_local GLOB '[0-2][0-9]:[0-5][0-9]'
          AND CAST(substr(time_local, 1, 2) AS INTEGER) BETWEEN 0 AND 23
        ),
        weekdays_mask INTEGER NOT NULL CHECK (weekdays_mask BETWEEN 1 AND 127),
        reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reminder_enabled IN (0, 1)),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id),
        FOREIGN KEY(medication_id, user_id) REFERENCES medications(id, user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_medication_schedules_user_time
        ON medication_schedules(user_id, active, time_local);

      CREATE TABLE IF NOT EXISTS medication_intakes (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        medication_id TEXT NOT NULL,
        schedule_id TEXT,
        planned_at TEXT NOT NULL,
        occurred_at TEXT,
        status TEXT NOT NULL CHECK (status IN ('taken', 'skipped')),
        note TEXT CHECK (note IS NULL OR length(note) <= 200),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(user_id, medication_id, schedule_id, planned_at),
        FOREIGN KEY(medication_id, user_id) REFERENCES medications(id, user_id) ON DELETE CASCADE,
        FOREIGN KEY(schedule_id, user_id) REFERENCES medication_schedules(id, user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_medication_intakes_user_planned
        ON medication_intakes(user_id, planned_at DESC);

      CREATE TABLE IF NOT EXISTS care_practices (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
        category TEXT NOT NULL CHECK (category IN ('breathing','exercise','sleep','therapy','hydration','mindfulness','custom')),
        description TEXT CHECK (description IS NULL OR length(description) <= 300),
        target_minutes INTEGER CHECK (target_minutes IS NULL OR target_minutes BETWEEN 1 AND 720),
        time_local TEXT CHECK (
          time_local IS NULL OR (
            time_local GLOB '[0-2][0-9]:[0-5][0-9]'
            AND CAST(substr(time_local, 1, 2) AS INTEGER) BETWEEN 0 AND 23
          )
        ),
        weekdays_mask INTEGER NOT NULL CHECK (weekdays_mask BETWEEN 1 AND 127),
        reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reminder_enabled IN (0, 1)),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_care_practices_user_active
        ON care_practices(user_id, active, title);

      CREATE TABLE IF NOT EXISTS care_practice_completions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        practice_id TEXT NOT NULL,
        planned_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL CHECK (status IN ('completed', 'skipped')),
        note TEXT CHECK (note IS NULL OR length(note) <= 200),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(user_id, practice_id, planned_at),
        FOREIGN KEY(practice_id, user_id) REFERENCES care_practices(id, user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_care_completions_user_planned
        ON care_practice_completions(user_id, planned_at DESC);

      CREATE TABLE IF NOT EXISTS local_notification_bindings (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('medication_schedule', 'care_practice')),
        entity_id TEXT NOT NULL,
        notification_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notification_bindings_entity
        ON local_notification_bindings(user_id, entity_type, entity_id);

      CREATE TABLE IF NOT EXISTS sync_cursors (
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        remote_cursor TEXT,
        remote_cursor_id TEXT,
        PRIMARY KEY(user_id, entity_type)
      );
    `,
  },
  {
    version: 7,
    sql: `
      ALTER TABLE medications ADD COLUMN stock_tracking_enabled INTEGER NOT NULL DEFAULT 0 CHECK (stock_tracking_enabled IN (0, 1));
      ALTER TABLE medications ADD COLUMN stock_quantity REAL CHECK (stock_quantity IS NULL OR stock_quantity >= 0);
      ALTER TABLE medications ADD COLUMN units_per_intake REAL CHECK (units_per_intake IS NULL OR units_per_intake > 0);
      ALTER TABLE medications ADD COLUMN refill_threshold REAL CHECK (refill_threshold IS NULL OR refill_threshold >= 0);
      ALTER TABLE medications ADD COLUMN refill_reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (refill_reminder_enabled IN (0, 1));
      ALTER TABLE medications ADD COLUMN refill_reminder_last_sent_at TEXT;

      CREATE TABLE IF NOT EXISTS professionals (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        specialty TEXT CHECK (specialty IS NULL OR length(specialty) <= 120),
        phone TEXT CHECK (phone IS NULL OR length(phone) <= 40),
        email TEXT CHECK (email IS NULL OR length(email) <= 200),
        notes TEXT CHECK (notes IS NULL OR length(notes) <= 400),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id)
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        professional_id TEXT,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 140),
        scheduled_at TEXT NOT NULL,
        duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 720),
        location TEXT CHECK (location IS NULL OR length(location) <= 200),
        notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
        status TEXT NOT NULL CHECK (status IN ('scheduled','completed','cancelled')),
        reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reminder_enabled IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id),
        FOREIGN KEY(professional_id, user_id) REFERENCES professionals(id, user_id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS treatments (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        professional_id TEXT,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 140),
        description TEXT CHECK (description IS NULL OR length(description) <= 500),
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('active','paused','completed')),
        notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id),
        FOREIGN KEY(professional_id, user_id) REFERENCES professionals(id, user_id) ON DELETE RESTRICT,
        CHECK (end_date IS NULL OR end_date >= start_date)
      );

      CREATE INDEX IF NOT EXISTS idx_professionals_user_active ON professionals(user_id, active, name);
      CREATE INDEX IF NOT EXISTS idx_appointments_user_scheduled ON appointments(user_id, scheduled_at DESC);
      CREATE INDEX IF NOT EXISTS idx_treatments_user_status ON treatments(user_id, status, start_date DESC);

      DROP INDEX IF EXISTS idx_notification_bindings_entity;
      ALTER TABLE local_notification_bindings RENAME TO local_notification_bindings_v6;
      CREATE TABLE local_notification_bindings (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('medication_schedule', 'care_practice', 'appointment', 'medication_refill')),
        entity_id TEXT NOT NULL,
        notification_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );
      INSERT INTO local_notification_bindings SELECT * FROM local_notification_bindings_v6;
      DROP TABLE local_notification_bindings_v6;
      CREATE INDEX IF NOT EXISTS idx_notification_bindings_entity ON local_notification_bindings(user_id, entity_type, entity_id);
    `,
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);');

  const row = await db.getFirstAsync<{ version: number | null }>('SELECT MAX(version) AS version FROM schema_migrations;');
  const currentVersion = row?.version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.runAsync(
        'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?);',
        migration.version,
        new Date().toISOString(),
      );
    });
  }
}
