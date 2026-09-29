import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { runBetaOperationMigrations } from '@/data/beta-operation-migrations';
import { runJournalMigrations } from '@/data/journal-migrations';
import { runSupportPlanMigrations } from '@/data/support-plan-migrations';
import { runMigrations } from '@/data/migrations';
import { getOrCreateDatabaseKey } from '@/data/secure-key';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openEncryptedDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('bemmecuida.db');
  const key = await getOrCreateDatabaseKey();

  // A chave é hexadecimal gerada localmente, sem entrada do usuário.
  await database.execAsync(`PRAGMA key = "x'${key}'";`);
  await database.execAsync('PRAGMA cipher_memory_security = ON;');
  if (Platform.OS !== 'web') {
    const cipherRow = await database.getFirstAsync<Record<string, string>>('PRAGMA cipher_version;');
    const cipherVersion = cipherRow ? Object.values(cipherRow)[0] : null;
    if (!cipherVersion) {
      await database.closeAsync();
      throw new Error('sqlcipher_required');
    }
  }
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await runMigrations(database);
  await runJournalMigrations(database);
  await runSupportPlanMigrations(database);
  await runBetaOperationMigrations(database);
  return database;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= openEncryptedDatabase();
  return databasePromise;
}
