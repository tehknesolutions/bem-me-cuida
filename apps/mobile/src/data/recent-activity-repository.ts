import { getDatabase } from '@/data/database';

export type RecentActivityKind = 'medication' | 'practice' | 'check_in';
export type RecentActivityHref = '/medications' | '/routines' | '/(tabs)/check-in';
export type ActivityFilterKind = 'all' | RecentActivityKind;
export type RecentActivity = { id: string; kind: RecentActivityKind; title: string; detail: string; occurredAt: string; synced: boolean; href: RecentActivityHref };
export type ActivityPageOptions = { limit?: number; offset?: number; kind?: ActivityFilterKind; query?: string; since?: string | null };
export type ActivityPage = { items: RecentActivity[]; hasMore: boolean };
export type WeeklyActivityFacts = { medicationRecords: number; practiceRecords: number; checkInRecords: number; activeDays: number; checkInDays: number; totalRecords: number };
export type DailyActivityFacts = { date: string; medicationRecords: number; practiceRecords: number; checkInRecords: number; totalRecords: number };
export type WeeklyComparisonFacts = { current: WeeklyActivityFacts; previous: WeeklyActivityFacts };

type ActivityRow = { id: string; kind: RecentActivityKind; title: string; detail: string; occurred_at: string; synced_at: string | null };
type WeeklyActivityRow = { medication_records: number; practice_records: number; check_in_records: number; active_days: number; check_in_days: number; total_records: number };
type DailyActivityRow = { activity_date: string; medication_records: number; practice_records: number; check_in_records: number; total_records: number };

const moodLabels: Record<string, string> = { very_low: 'Humor muito difícil', low: 'Humor difícil', neutral: 'Humor neutro', good: 'Humor bem', very_good: 'Humor muito bem' };
function hrefFor(kind: RecentActivityKind): RecentActivityHref { if (kind === 'medication') return '/medications'; if (kind === 'practice') return '/routines'; return '/(tabs)/check-in'; }
function mapActivity(row: ActivityRow): RecentActivity { return { id: row.id, kind: row.kind, title: row.title, detail: row.kind === 'check_in' ? (moodLabels[row.detail] ?? 'Check-in registrado') : row.detail, occurredAt: row.occurred_at, synced: Boolean(row.synced_at), href: hrefFor(row.kind) }; }

const activityUnion = `
  SELECT * FROM (
    SELECT i.id AS id, 'medication' AS kind, m.name AS title,
      CASE WHEN i.status = 'taken' THEN m.dosage_text ELSE 'Dose registrada como não tomada' END AS detail,
      COALESCE(i.occurred_at, i.updated_at) AS occurred_at, i.synced_at AS synced_at
    FROM medication_intakes i INNER JOIN medications m ON m.id = i.medication_id AND m.user_id = i.user_id
    WHERE i.user_id = ? AND i.deleted_at IS NULL AND m.deleted_at IS NULL
    UNION ALL
    SELECT c.id AS id, 'practice' AS kind, p.title AS title,
      CASE WHEN c.status = 'completed' THEN CAST(p.target_minutes AS TEXT) || ' min concluídos' ELSE 'Prática registrada como não concluída' END AS detail,
      COALESCE(c.completed_at, c.updated_at) AS occurred_at, c.synced_at AS synced_at
    FROM care_practice_completions c INNER JOIN care_practices p ON p.id = c.practice_id AND p.user_id = c.user_id
    WHERE c.user_id = ? AND c.deleted_at IS NULL AND p.deleted_at IS NULL
    UNION ALL
    SELECT id, 'check_in' AS kind, 'Check-in emocional' AS title, mood AS detail, occurred_at, synced_at
    FROM mood_checkins WHERE user_id = ? AND deleted_at IS NULL
  ) activity
`;
const factualActivityCte = `
  WITH activity AS (
    SELECT 'medication' AS kind, COALESCE(i.occurred_at, i.updated_at) AS occurred_at
    FROM medication_intakes i INNER JOIN medications m ON m.id = i.medication_id AND m.user_id = i.user_id
    WHERE i.user_id = ? AND i.deleted_at IS NULL AND m.deleted_at IS NULL
    UNION ALL
    SELECT 'practice' AS kind, COALESCE(c.completed_at, c.updated_at) AS occurred_at
    FROM care_practice_completions c INNER JOIN care_practices p ON p.id = c.practice_id AND p.user_id = c.user_id
    WHERE c.user_id = ? AND c.deleted_at IS NULL AND p.deleted_at IS NULL
    UNION ALL
    SELECT 'check_in' AS kind, occurred_at FROM mood_checkins WHERE user_id = ? AND deleted_at IS NULL
  )
`;

export async function listActivityPage(userId: string, options: ActivityPageOptions = {}): Promise<ActivityPage> {
  const db = await getDatabase(); const limit = Math.min(50, Math.max(1, options.limit ?? 20)); const offset = Math.max(0, options.offset ?? 0); const kind = options.kind ?? 'all';
  const normalizedQuery = options.query?.trim().toLocaleLowerCase('pt-BR') ?? ''; const clauses: string[] = []; const params: Array<string | number> = [userId, userId, userId];
  if (kind !== 'all') { clauses.push('kind = ?'); params.push(kind); }
  if (options.since) { clauses.push('occurred_at >= ?'); params.push(options.since); }
  if (normalizedQuery) { clauses.push('(LOWER(title) LIKE ? OR LOWER(detail) LIKE ?)'); const pattern = `%${normalizedQuery}%`; params.push(pattern, pattern); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.getAllAsync<ActivityRow>(`${activityUnion} ${where} ORDER BY occurred_at DESC LIMIT ? OFFSET ?;`, ...params, limit + 1, offset);
  return { items: rows.slice(0, limit).map(mapActivity), hasMore: rows.length > limit };
}
export async function listRecentActivities(userId: string, limit = 6): Promise<RecentActivity[]> { return (await listActivityPage(userId, { limit })).items; }

export async function getWeeklyActivityFacts(userId: string, since: string, until?: string): Promise<WeeklyActivityFacts> {
  const db = await getDatabase(); const endClause = until ? ' AND occurred_at < ?' : ''; const params: Array<string> = [userId, userId, userId, since]; if (until) params.push(until);
  const row = await db.getFirstAsync<WeeklyActivityRow>(`${factualActivityCte}
    SELECT SUM(CASE WHEN kind = 'medication' THEN 1 ELSE 0 END) AS medication_records,
      SUM(CASE WHEN kind = 'practice' THEN 1 ELSE 0 END) AS practice_records,
      SUM(CASE WHEN kind = 'check_in' THEN 1 ELSE 0 END) AS check_in_records,
      COUNT(DISTINCT date(occurred_at, 'localtime')) AS active_days,
      COUNT(DISTINCT CASE WHEN kind = 'check_in' THEN date(occurred_at, 'localtime') END) AS check_in_days,
      COUNT(*) AS total_records FROM activity WHERE occurred_at >= ?${endClause};`, ...params);
  return { medicationRecords: row?.medication_records ?? 0, practiceRecords: row?.practice_records ?? 0, checkInRecords: row?.check_in_records ?? 0, activeDays: row?.active_days ?? 0, checkInDays: row?.check_in_days ?? 0, totalRecords: row?.total_records ?? 0 };
}

export async function getWeeklyComparisonFacts(userId: string, currentSince: string, currentUntil: string, previousSince: string, previousUntil: string): Promise<WeeklyComparisonFacts> {
  const [current, previous] = await Promise.all([
    getWeeklyActivityFacts(userId, currentSince, currentUntil),
    getWeeklyActivityFacts(userId, previousSince, previousUntil),
  ]);
  return { current, previous };
}

export async function listWeeklyDailyFacts(userId: string, since: string, until?: string): Promise<DailyActivityFacts[]> {
  const db = await getDatabase(); const endClause = until ? ' AND occurred_at < ?' : ''; const params: Array<string> = [userId, userId, userId, since]; if (until) params.push(until);
  const rows = await db.getAllAsync<DailyActivityRow>(`${factualActivityCte}
    SELECT date(occurred_at, 'localtime') AS activity_date,
      SUM(CASE WHEN kind = 'medication' THEN 1 ELSE 0 END) AS medication_records,
      SUM(CASE WHEN kind = 'practice' THEN 1 ELSE 0 END) AS practice_records,
      SUM(CASE WHEN kind = 'check_in' THEN 1 ELSE 0 END) AS check_in_records,
      COUNT(*) AS total_records FROM activity WHERE occurred_at >= ?${endClause}
    GROUP BY date(occurred_at, 'localtime') ORDER BY activity_date ASC;`, ...params);
  return rows.map((row) => ({ date: row.activity_date, medicationRecords: row.medication_records ?? 0, practiceRecords: row.practice_records ?? 0, checkInRecords: row.check_in_records ?? 0, totalRecords: row.total_records ?? 0 }));
}
