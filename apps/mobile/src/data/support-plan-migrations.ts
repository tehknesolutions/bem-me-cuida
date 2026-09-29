import type { SQLiteDatabase } from 'expo-sqlite';

const SUPPORT_PLAN_SCHEMA_VERSION = 9;

export async function runSupportPlanMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ version: number | null }>('SELECT MAX(version) AS version FROM schema_migrations;');
  if ((row?.version ?? 0) >= SUPPORT_PLAN_SCHEMA_VERSION) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS support_plans (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL UNIQUE,
        warning_signs_json TEXT NOT NULL DEFAULT '[]',
        immediate_actions_json TEXT NOT NULL DEFAULT '[]',
        safe_places_json TEXT NOT NULL DEFAULT '[]',
        important_reminder TEXT CHECK (important_reminder IS NULL OR length(important_reminder) <= 500),
        grounding_reminder TEXT CHECK (grounding_reminder IS NULL OR length(grounding_reminder) <= 500),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id)
      );

      CREATE TABLE IF NOT EXISTS support_contacts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        relationship TEXT CHECK (relationship IS NULL OR length(relationship) <= 80),
        phone TEXT NOT NULL CHECK (length(phone) BETWEEN 3 AND 40),
        availability_notes TEXT CHECK (availability_notes IS NULL OR length(availability_notes) <= 240),
        priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_support_contacts_user_priority
        ON support_contacts(user_id, active, priority, name);
    `);
    await db.runAsync(
      'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?);',
      SUPPORT_PLAN_SCHEMA_VERSION,
      new Date().toISOString(),
    );
  });
}
