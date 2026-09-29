import type { SQLiteDatabase } from 'expo-sqlite';

export const BETA_OPERATION_SCHEMA_VERSION = 10;

export async function runBetaOperationMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations;',
  );
  if ((row?.version ?? 0) >= BETA_OPERATION_SCHEMA_VERSION) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DROP INDEX IF EXISTS idx_notification_bindings_entity;
      ALTER TABLE local_notification_bindings RENAME TO local_notification_bindings_v9;
      CREATE TABLE local_notification_bindings (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (
          entity_type IN ('medication_schedule', 'care_practice', 'appointment', 'medication_refill', 'daily_checkin')
        ),
        entity_id TEXT NOT NULL,
        notification_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );
      INSERT INTO local_notification_bindings SELECT * FROM local_notification_bindings_v9;
      DROP TABLE local_notification_bindings_v9;
      CREATE INDEX IF NOT EXISTS idx_notification_bindings_entity
        ON local_notification_bindings(user_id, entity_type, entity_id);

      CREATE TABLE IF NOT EXISTS technical_events (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        event_name TEXT NOT NULL CHECK (
          event_name IN (
            'app_session_started',
            'app_backgrounded',
            'app_foregrounded',
            'diagnostics_completed',
            'feedback_submitted',
            'feedback_failed'
          )
        ),
        context_json TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_technical_events_user_occurred
        ON technical_events(user_id, occurred_at DESC);
    `);
    await db.runAsync(
      'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?);',
      BETA_OPERATION_SCHEMA_VERSION,
      new Date().toISOString(),
    );
  });
}
