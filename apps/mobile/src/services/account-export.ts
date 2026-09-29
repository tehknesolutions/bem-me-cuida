import type { Profile } from '@bemmecuida/domain';

import type { ConsentState } from '@/data/account-repository';
import { getDatabase } from '@/data/database';
import { supabase } from '@/services/supabase';

const localExportTables = [
  'mood_checkins',
  'medications',
  'medication_schedules',
  'medication_intakes',
  'care_practices',
  'care_practice_completions',
  'professionals',
  'appointments',
  'treatments',
  'journal_entries',
  'support_plans',
  'support_contacts',
] as const;

export type AccountExport = {
  exportVersion: '1.1';
  generatedAt: string;
  generatedBy: 'Tehkné Solutions';
  account: {
    id: string;
    email: string | null;
    profile: Profile | null;
    consents: ConsentState;
  };
  data: Record<string, Array<Record<string, unknown>>>;
  notice: string;
};

async function loadRemoteBetaData(userId: string): Promise<Record<string, Array<Record<string, unknown>>>> {
  if (!supabase) return { beta_feedback: [], beta_tester_enrollments: [] };
  const [feedbackResult, enrollmentResult] = await Promise.all([
    supabase.from('beta_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('beta_tester_enrollments').select('*').eq('user_id', userId),
  ]);
  if (feedbackResult.error) throw feedbackResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;
  return {
    beta_feedback: (feedbackResult.data ?? []) as Array<Record<string, unknown>>,
    beta_tester_enrollments: (enrollmentResult.data ?? []) as Array<Record<string, unknown>>,
  };
}

export async function buildAccountExport(input: {
  userId: string;
  email: string | null;
  profile: Profile | null;
  consents: ConsentState;
}): Promise<AccountExport> {
  const db = await getDatabase();
  const data: Record<string, Array<Record<string, unknown>>> = {};

  for (const table of localExportTables) {
    data[table] = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE user_id = ? ORDER BY updated_at ASC;`,
      input.userId,
    );
  }

  data.technical_events = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM technical_events WHERE user_id = ? ORDER BY occurred_at ASC;',
    input.userId,
  );
  Object.assign(data, await loadRemoteBetaData(input.userId));

  return {
    exportVersion: '1.1',
    generatedAt: new Date().toISOString(),
    generatedBy: 'Tehkné Solutions',
    account: {
      id: input.userId,
      email: input.email,
      profile: input.profile,
      consents: input.consents,
    },
    data,
    notice: 'Exportação solicitada pelo titular. O arquivo pode conter dados emocionais, de saúde e relatos enviados durante a beta.',
  };
}

export function formatAccountExport(value: AccountExport): string {
  return JSON.stringify(value, null, 2);
}
