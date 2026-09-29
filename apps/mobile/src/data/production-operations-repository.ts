import { supabase } from '@/services/supabase';

export type StoreName = 'google_play' | 'app_store';
export type StoreTrack = 'internal' | 'closed' | 'open' | 'production' | 'testflight';
export type StoreSubmissionStatus = 'draft' | 'uploaded' | 'in_review' | 'approved' | 'rejected' | 'published' | 'withdrawn';
export type RolloutStatus = 'active' | 'paused' | 'completed' | 'rolled_back';
export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export type IncidentStatus = 'open' | 'monitoring' | 'resolved';

export type StoreSubmission = {
  id: string;
  candidateId: string;
  buildId: string;
  store: StoreName;
  track: StoreTrack;
  status: StoreSubmissionStatus;
  externalReference: string | null;
  notes: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductionRollout = {
  id: string;
  candidateId: string;
  submissionId: string;
  store: StoreName;
  track: Exclude<StoreTrack, 'internal'>;
  targetPercent: number;
  status: RolloutStatus;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  rolledBackAt: string | null;
  updatedAt: string;
};

export type ProductionHealthSnapshot = {
  id: string;
  rolloutId: string;
  windowStart: string;
  windowEnd: string;
  source: 'aggregated' | 'manual_review';
  crashFreeSessionsPct: number;
  syncSuccessPct: number;
  authSuccessPct: number;
  notificationSuccessPct: number | null;
  supportTicketCount: number;
  blockerCount: number;
  sampledSessions: number;
  createdAt: string;
};

export type ProductionIncident = {
  id: string;
  candidateId: string;
  rolloutId: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  summary: string;
  technicalImpact: string | null;
  startedAt: string;
  resolvedAt: string | null;
  updatedAt: string;
};

export type ProductionIncidentUpdate = {
  id: number;
  incidentId: string;
  status: IncidentStatus;
  message: string;
  createdAt: string;
};

function requireSupabase() {
  if (!supabase) throw new Error('supabase_not_configured');
  return supabase;
}

export async function listStoreSubmissions(candidateId?: string): Promise<StoreSubmission[]> {
  const client = requireSupabase();
  let query = client
    .from('store_submissions')
    .select('id, candidate_id, build_id, store, track, status, external_reference, notes, submitted_at, published_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (candidateId) query = query.eq('candidate_id', candidateId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    buildId: row.build_id,
    store: row.store as StoreName,
    track: row.track as StoreTrack,
    status: row.status as StoreSubmissionStatus,
    externalReference: row.external_reference,
    notes: row.notes,
    submittedAt: row.submitted_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function registerStoreSubmission(input: {
  candidateId: string;
  buildId: string;
  store: StoreName;
  track: StoreTrack;
  status: StoreSubmissionStatus;
  externalReference: string | null;
  notes: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_register_store_submission', {
    p_candidate_id: input.candidateId,
    p_build_id: input.buildId,
    p_store: input.store,
    p_track: input.track,
    p_status: input.status,
    p_external_reference: input.externalReference,
    p_notes: input.notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('store_submission_id_missing');
  return data;
}

export async function updateStoreSubmission(input: {
  submissionId: string;
  status: StoreSubmissionStatus;
  externalReference: string | null;
  notes: string | null;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_update_store_submission', {
    p_submission_id: input.submissionId,
    p_status: input.status,
    p_external_reference: input.externalReference,
    p_notes: input.notes,
  });
  if (error) throw error;
}

export async function listProductionRollouts(candidateId?: string): Promise<ProductionRollout[]> {
  const client = requireSupabase();
  let query = client
    .from('production_rollouts')
    .select('id, candidate_id, submission_id, store, track, target_percent, status, notes, started_at, completed_at, rolled_back_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (candidateId) query = query.eq('candidate_id', candidateId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    submissionId: row.submission_id,
    store: row.store as StoreName,
    track: row.track as ProductionRollout['track'],
    targetPercent: Number(row.target_percent),
    status: row.status as RolloutStatus,
    notes: row.notes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    rolledBackAt: row.rolled_back_at,
    updatedAt: row.updated_at,
  }));
}

export async function startProductionRollout(input: {
  candidateId: string;
  submissionId: string;
  store: StoreName;
  track: ProductionRollout['track'];
  notes: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_start_rollout', {
    p_candidate_id: input.candidateId,
    p_submission_id: input.submissionId,
    p_store: input.store,
    p_track: input.track,
    p_notes: input.notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('production_rollout_id_missing');
  return data;
}

export async function listHealthSnapshots(rolloutId: string): Promise<ProductionHealthSnapshot[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('production_health_snapshots')
    .select('id, rollout_id, window_start, window_end, source, crash_free_sessions_pct, sync_success_pct, auth_success_pct, notification_success_pct, support_ticket_count, blocker_count, sampled_sessions, created_at')
    .eq('rollout_id', rolloutId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    rolloutId: row.rollout_id,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    source: row.source as ProductionHealthSnapshot['source'],
    crashFreeSessionsPct: Number(row.crash_free_sessions_pct),
    syncSuccessPct: Number(row.sync_success_pct),
    authSuccessPct: Number(row.auth_success_pct),
    notificationSuccessPct: row.notification_success_pct === null ? null : Number(row.notification_success_pct),
    supportTicketCount: Number(row.support_ticket_count),
    blockerCount: Number(row.blocker_count),
    sampledSessions: Number(row.sampled_sessions),
    createdAt: row.created_at,
  }));
}

export async function recordHealthSnapshot(input: {
  rolloutId: string;
  windowStart: string;
  windowEnd: string;
  crashFreeSessionsPct: number;
  syncSuccessPct: number;
  authSuccessPct: number;
  notificationSuccessPct: number | null;
  supportTicketCount: number;
  blockerCount: number;
  sampledSessions: number;
  source: ProductionHealthSnapshot['source'];
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_record_health_snapshot', {
    p_rollout_id: input.rolloutId,
    p_window_start: input.windowStart,
    p_window_end: input.windowEnd,
    p_crash_free_sessions_pct: input.crashFreeSessionsPct,
    p_sync_success_pct: input.syncSuccessPct,
    p_auth_success_pct: input.authSuccessPct,
    p_notification_success_pct: input.notificationSuccessPct,
    p_support_ticket_count: input.supportTicketCount,
    p_blocker_count: input.blockerCount,
    p_sampled_sessions: input.sampledSessions,
    p_source: input.source,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('production_health_snapshot_id_missing');
  return data;
}

export async function advanceProductionRollout(rolloutId: string, targetPercent: 5 | 10 | 25 | 50 | 100): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_advance_rollout', {
    p_rollout_id: rolloutId,
    p_target_percent: targetPercent,
  });
  if (error) throw error;
}

export async function pauseProductionRollout(rolloutId: string, notes: string | null): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_pause_rollout', {
    p_rollout_id: rolloutId,
    p_notes: notes,
  });
  if (error) throw error;
}

export async function rollbackProductionRollout(rolloutId: string, reason: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_rollback_rollout', {
    p_rollout_id: rolloutId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}

export async function listProductionIncidents(candidateId?: string): Promise<ProductionIncident[]> {
  const client = requireSupabase();
  let query = client
    .from('production_incidents')
    .select('id, candidate_id, rollout_id, severity, status, title, summary, technical_impact, started_at, resolved_at, updated_at')
    .order('started_at', { ascending: false })
    .limit(60);
  if (candidateId) query = query.eq('candidate_id', candidateId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    rolloutId: row.rollout_id,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    title: row.title,
    summary: row.summary,
    technicalImpact: row.technical_impact,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
  }));
}

export async function listIncidentUpdates(incidentId: string): Promise<ProductionIncidentUpdate[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('production_incident_updates')
    .select('id, incident_id, status, message, created_at')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    incidentId: row.incident_id,
    status: row.status as IncidentStatus,
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function openProductionIncident(input: {
  candidateId: string;
  rolloutId: string | null;
  severity: IncidentSeverity;
  title: string;
  summary: string;
  technicalImpact: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_open_incident', {
    p_candidate_id: input.candidateId,
    p_rollout_id: input.rolloutId,
    p_severity: input.severity,
    p_title: input.title.trim(),
    p_summary: input.summary.trim(),
    p_technical_impact: input.technicalImpact,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('production_incident_id_missing');
  return data;
}

export async function updateProductionIncident(incidentId: string, status: IncidentStatus, message: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_update_incident', {
    p_incident_id: incidentId,
    p_status: status,
    p_message: message.trim(),
  });
  if (error) throw error;
}
