import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';

export type ReleaseCandidateStatus = 'draft' | 'qa' | 'blocked' | 'approved' | 'promoted' | 'rolled_back';
export type ReleaseGateStatus = 'pending' | 'passed' | 'failed' | 'waived';
export type ReleaseBuildStatus = 'pending' | 'available' | 'revoked';
export type ReleaseBuildAudience = 'internal' | 'closed_beta' | 'store';
export type ReleasePlatform = 'android' | 'ios';
export type OperatorFeedbackStatus = 'received' | 'triaged' | 'planned' | 'resolved' | 'closed';
export type OperatorFeedbackPriority = 'low' | 'normal' | 'high' | 'urgent';
export type BetaTesterStatus = 'active' | 'paused';

export type ReleaseCandidate = {
  id: string;
  version: string;
  rcNumber: number;
  title: string;
  channel: 'rc' | 'production';
  status: ReleaseCandidateStatus;
  notes: string | null;
  promotedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReleaseGate = {
  id: string;
  candidateId: string;
  gateKey: string;
  label: string;
  required: boolean;
  status: ReleaseGateStatus;
  evidence: string | null;
  checkedAt: string | null;
};

export type ReleaseBuild = {
  id: string;
  candidateId: string;
  platform: ReleasePlatform;
  buildProfile: string;
  buildNumber: string;
  artifactUrl: string;
  artifactSha256: string | null;
  audience: ReleaseBuildAudience;
  status: ReleaseBuildStatus;
  createdAt: string;
};

export type OperatorFeedback = {
  id: string;
  category: string;
  impact: 'low' | 'medium' | 'high' | 'blocking';
  message: string;
  status: OperatorFeedbackStatus;
  priority: OperatorFeedbackPriority;
  operatorNotes: string | null;
  candidateId: string | null;
  appVersion: string;
  appVariant: string;
  platform: string;
  createdAt: string;
};

export type BetaTester = {
  userId: string;
  status: BetaTesterStatus;
  appVersion: string;
  appVariant: string;
  platform: string;
  enrolledAt: string;
  updatedAt: string;
};

export type OperatorAuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function requireSupabase() {
  if (!supabase) throw new Error('supabase_not_configured');
  return supabase;
}

export function isReleaseOperator(session: Session | null): boolean {
  const role = session?.user.app_metadata?.role;
  return role === 'release_operator' || role === 'release_admin';
}

export async function listReleaseCandidates(): Promise<ReleaseCandidate[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('release_candidates')
    .select('id, version, rc_number, title, channel, status, notes, promoted_at, rolled_back_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    version: row.version,
    rcNumber: row.rc_number,
    title: row.title,
    channel: row.channel as ReleaseCandidate['channel'],
    status: row.status as ReleaseCandidateStatus,
    notes: row.notes,
    promotedAt: row.promoted_at,
    rolledBackAt: row.rolled_back_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createReleaseCandidate(input: {
  version: string;
  rcNumber: number;
  title: string;
  notes: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_release_candidate', {
    p_version: input.version.trim(),
    p_rc_number: input.rcNumber,
    p_title: input.title.trim(),
    p_notes: input.notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('release_candidate_id_missing');
  return data;
}

export async function listReleaseGates(candidateId: string): Promise<ReleaseGate[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('release_gates')
    .select('id, candidate_id, gate_key, label, required, status, evidence, checked_at')
    .eq('candidate_id', candidateId)
    .order('required', { ascending: false })
    .order('label', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    gateKey: row.gate_key,
    label: row.label,
    required: row.required,
    status: row.status as ReleaseGateStatus,
    evidence: row.evidence,
    checkedAt: row.checked_at,
  }));
}

export async function setReleaseGate(input: {
  candidateId: string;
  gateKey: string;
  status: ReleaseGateStatus;
  evidence: string | null;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_set_release_gate', {
    p_candidate_id: input.candidateId,
    p_gate_key: input.gateKey,
    p_status: input.status,
    p_evidence: input.evidence,
  });
  if (error) throw error;
}

export async function listReleaseBuilds(candidateId: string): Promise<ReleaseBuild[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('release_builds')
    .select('id, candidate_id, platform, build_profile, build_number, artifact_url, artifact_sha256, audience, status, created_at')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    platform: row.platform as ReleasePlatform,
    buildProfile: row.build_profile,
    buildNumber: row.build_number,
    artifactUrl: row.artifact_url,
    artifactSha256: row.artifact_sha256,
    audience: row.audience as ReleaseBuildAudience,
    status: row.status as ReleaseBuildStatus,
    createdAt: row.created_at,
  }));
}

export async function registerReleaseBuild(input: {
  candidateId: string;
  platform: ReleasePlatform;
  buildProfile: string;
  buildNumber: string;
  artifactUrl: string;
  artifactSha256: string | null;
  audience: ReleaseBuildAudience;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_register_release_build', {
    p_candidate_id: input.candidateId,
    p_platform: input.platform,
    p_build_profile: input.buildProfile.trim(),
    p_build_number: input.buildNumber.trim(),
    p_artifact_url: input.artifactUrl.trim(),
    p_artifact_sha256: input.artifactSha256,
    p_audience: input.audience,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('release_build_id_missing');
  return data;
}

export async function revokeReleaseBuild(buildId: string, reason: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_revoke_release_build', {
    p_build_id: buildId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}

export async function setReleaseStatus(
  candidateId: string,
  status: Exclude<ReleaseCandidateStatus, 'promoted'>,
  notes: string | null,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_set_release_status', {
    p_candidate_id: candidateId,
    p_status: status,
    p_notes: notes,
  });
  if (error) throw error;
}

export async function promoteReleaseCandidate(candidateId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_promote_release', { p_candidate_id: candidateId });
  if (error) throw error;
}

export async function listOperatorFeedback(): Promise<OperatorFeedback[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('beta_feedback')
    .select('id, category, impact, message, status, priority, operator_notes, candidate_id, app_version, app_variant, platform, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    impact: row.impact as OperatorFeedback['impact'],
    message: row.message,
    status: row.status as OperatorFeedbackStatus,
    priority: row.priority as OperatorFeedbackPriority,
    operatorNotes: row.operator_notes,
    candidateId: row.candidate_id,
    appVersion: row.app_version,
    appVariant: row.app_variant,
    platform: row.platform,
    createdAt: row.created_at,
  }));
}

export async function updateOperatorFeedback(input: {
  feedbackId: string;
  status: OperatorFeedbackStatus;
  priority: OperatorFeedbackPriority;
  operatorNotes: string | null;
  candidateId: string | null;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_update_feedback', {
    p_feedback_id: input.feedbackId,
    p_status: input.status,
    p_priority: input.priority,
    p_operator_notes: input.operatorNotes,
    p_candidate_id: input.candidateId,
  });
  if (error) throw error;
}

export async function listBetaTesters(): Promise<BetaTester[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('beta_tester_enrollments')
    .select('user_id, status, app_version, app_variant, platform, enrolled_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    status: row.status as BetaTesterStatus,
    appVersion: row.app_version,
    appVariant: row.app_variant,
    platform: row.platform,
    enrolledAt: row.enrolled_at,
    updatedAt: row.updated_at,
  }));
}

export async function setBetaTesterStatus(userId: string, status: BetaTesterStatus): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_set_tester_status', {
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw error;
}

export async function listOperatorAuditLog(): Promise<OperatorAuditEntry[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('operator_audit_log')
    .select('id, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}
