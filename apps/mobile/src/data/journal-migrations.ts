import type { SQLiteDatabase } from 'expo-sqlite';

const JOURNAL_SCHEMA_VERSION = 8;

export async function runJournalMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations;',
  );
  if ((row?.version ?? 0) >= JOURNAL_SCHEMA_VERSION) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        title TEXT CHECK (title IS NULL OR length(title) BETWEEN 1 AND 120),
        body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
        emotions_json TEXT NOT NULL,
        intensity INTEGER NOT NULL CHECK (intensity BETWEEN 0 AND 10),
        triggers_json TEXT NOT NULL DEFAULT '[]',
        strategies_json TEXT NOT NULL DEFAULT '[]',
        for_therapy INTEGER NOT NULL DEFAULT 0 CHECK (for_therapy IN (0, 1)),
        linked_checkin_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT,
        UNIQUE(id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_journal_entries_user_occurred
        ON journal_entries(user_id, occurred_at DESC);

      CREATE INDEX IF NOT EXISTS idx_journal_entries_user_therapy
        ON journal_entries(user_id, for_therapy, occurred_at DESC);
    `);
    await db.runAsync(
      'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?);',
      JOURNAL_SCHEMA_VERSION,
      new Date().toISOString(),
    );
  });
}
