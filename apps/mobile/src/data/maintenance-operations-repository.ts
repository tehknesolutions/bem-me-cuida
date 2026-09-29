import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';

export type MaintenanceHotfixKind = 'ota' | 'binary';
export type MaintenanceHotfixSeverity = 'critical' | 'high' | 'medium' | 'low';
export type MaintenanceHotfixStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'approved'
  | 'building'
  | 'ready'
  | 'deployed'
  | 'rolled_back'
  | 'cancelled';
export type ApprovalDecision = 'approved' | 'rejected';
export type OtaPlanStatus = 'draft' | 'approved' | 'published' | 'rolled_back' | 'cancelled';

export type MaintenanceHotfix = {
  id: string;
  version: string;
  kind: MaintenanceHotfixKind;
  severity: MaintenanceHotfixSeverity;
  title: string;
  summary: string;
  targetRuntimeVersion: string;
  targetChannel: 'production' | 'hotfix-validation';
  sourceCommit: string;
  nativeChanges: boolean;
  requiresBinary: boolean;
  status: MaintenanceHotfixStatus;
  createdBy: string;
  approvedAt: string | null;
  deployedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationApproval = {
  id: string;
  entityType: 'hotfix' | 'ota_update' | 'retention_run';
  entityId: string;
  decision: ApprovalDecision;
  comment: string | null;
  decidedBy: string;
  createdAt: string;
};

export type HotfixArtifact = {
  id: string;
  hotfixId: string;
  platform: 'android' | 'ios';
  buildNumber: string;
  artifactUrl: string;
  artifactSha256: string;
  status: 'available' | 'revoked' | 'deployed';
  createdAt: string;
};

export type OtaUpdatePlan = {
  id: string;
  hotfixId: string;
  channel: 'production' | 'hotfix-validation';
  runtimeVersion: string;
  message: string;
  fingerprintSha256: string;
  assetCount: number;
  rolloutPercentage: 1 | 5 | 10 | 25 | 50 | 100;
  updateGroupId: string | null;
  status: OtaPlanStatus;
  createdBy: string;
  publishedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationsRetentionRun = {
  id: string;
  policyVersion: string;
  dryRun: boolean;
  healthCutoff: string;
  auditCutoff: string;
  incidentUpdateCutoff: string;
  eligibleHealthCount: number;
  eligibleAuditCount: number;
  eligibleIncidentUpdateCount: number;
  deletedHealthCount: number;
  deletedAuditCount: number;
  deletedIncidentUpdateCount: number;
  status: 'planned' | 'completed' | 'failed';
  executedAt: string | null;
  createdAt: string;
};

function requireSupabase() {
  if (!supabase) throw new Error('supabase_not_configured');
  return supabase;
}

export function isReleaseAdmin(session: Session | null): boolean {
  return session?.user.app_metadata?.role === 'release_admin';
}

export async function listMaintenanceHotfixes(): Promise<MaintenanceHotfix[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('maintenance_hotfixes')
    .select('id, version, kind, severity, title, summary, target_runtime_version, target_channel, source_commit, native_changes, requires_binary, status, created_by, approved_at, deployed_at, rolled_back_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    version: row.version,
    kind: row.kind as MaintenanceHotfixKind,
    severity: row.severity as MaintenanceHotfixSeverity,
    title: row.title,
    summary: row.summary,
    targetRuntimeVersion: row.target_runtime_version,
    targetChannel: row.target_channel as MaintenanceHotfix['targetChannel'],
    sourceCommit: row.source_commit,
    nativeChanges: Boolean(row.native_changes),
    requiresBinary: Boolean(row.requires_binary),
    status: row.status as MaintenanceHotfixStatus,
    createdBy: row.created_by,
    approvedAt: row.approved_at,
    deployedAt: row.deployed_at,
    rolledBackAt: row.rolled_back_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createMaintenanceHotfix(input: {
  version: string;
  kind: MaintenanceHotfixKind;
  severity: MaintenanceHotfixSeverity;
  title: string;
  summary: string;
  targetRuntimeVersion: string;
  targetChannel: MaintenanceHotfix['targetChannel'];
  sourceCommit: string;
  nativeChanges: boolean;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_hotfix', {
    p_version: input.version.trim(),
    p_kind: input.kind,
    p_severity: input.severity,
    p_title: input.title.trim(),
    p_summary: input.summary.trim(),
    p_target_runtime_version: input.targetRuntimeVersion.trim(),
    p_target_channel: input.targetChannel,
    p_source_commit: input.sourceCommit.trim(),
    p_native_changes: input.nativeChanges,
    p_requires_binary: input.kind === 'binary',
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('hotfix_id_missing');
  return data;
}

export async function requestMaintenanceHotfixApproval(hotfixId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_request_hotfix_approval', { p_hotfix_id: hotfixId });
  if (error) throw error;
}

export async function decideMaintenanceHotfix(
  hotfixId: string,
  decision: ApprovalDecision,
  comment: string | null,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_decide_hotfix', {
    p_hotfix_id: hotfixId,
    p_decision: decision,
    p_comment: comment,
  });
  if (error) throw error;
}

export async function listOperationApprovals(entityId?: string): Promise<OperationApproval[]> {
  const client = requireSupabase();
  let query = client
    .from('operation_approvals')
    .select('id, entity_type, entity_id, decision, comment, decided_by, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (entityId) query = query.eq('entity_id', entityId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    entityType: row.entity_type as OperationApproval['entityType'],
    entityId: row.entity_id,
    decision: row.decision as ApprovalDecision,
    comment: row.comment,
    decidedBy: row.decided_by,
    createdAt: row.created_at,
  }));
}

export async function listHotfixArtifacts(hotfixId?: string): Promise<HotfixArtifact[]> {
  const client = requireSupabase();
  let query = client
    .from('hotfix_artifacts')
    .select('id, hotfix_id, platform, build_number, artifact_url, artifact_sha256, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (hotfixId) query = query.eq('hotfix_id', hotfixId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    hotfixId: row.hotfix_id,
    platform: row.platform as HotfixArtifact['platform'],
    buildNumber: row.build_number,
    artifactUrl: row.artifact_url,
    artifactSha256: row.artifact_sha256,
    status: row.status as HotfixArtifact['status'],
    createdAt: row.created_at,
  }));
}

export async function registerHotfixArtifact(input: {
  hotfixId: string;
  platform: HotfixArtifact['platform'];
  buildNumber: string;
  artifactUrl: string;
  artifactSha256: string;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_register_hotfix_artifact', {
    p_hotfix_id: input.hotfixId,
    p_platform: input.platform,
    p_build_number: input.buildNumber.trim(),
    p_artifact_url: input.artifactUrl.trim(),
    p_artifact_sha256: input.artifactSha256.trim(),
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('hotfix_artifact_id_missing');
  return data;
}

export async function deployBinaryHotfix(hotfixId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_deploy_binary_hotfix', { p_hotfix_id: hotfixId });
  if (error) throw error;
}

export async function listOtaUpdatePlans(hotfixId?: string): Promise<OtaUpdatePlan[]> {
  const client = requireSupabase();
  let query = client
    .from('ota_update_plans')
    .select('id, hotfix_id, channel, runtime_version, message, fingerprint_sha256, asset_count, rollout_percentage, update_group_id, status, created_by, published_at, rolled_back_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (hotfixId) query = query.eq('hotfix_id', hotfixId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    hotfixId: row.hotfix_id,
    channel: row.channel as OtaUpdatePlan['channel'],
    runtimeVersion: row.runtime_version,
    message: row.message,
    fingerprintSha256: row.fingerprint_sha256,
    assetCount: Number(row.asset_count),
    rolloutPercentage: Number(row.rollout_percentage) as OtaUpdatePlan['rolloutPercentage'],
    updateGroupId: row.update_group_id,
    status: row.status as OtaPlanStatus,
    createdBy: row.created_by,
    publishedAt: row.published_at,
    rolledBackAt: row.rolled_back_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createOtaUpdatePlan(input: {
  hotfixId: string;
  channel: OtaUpdatePlan['channel'];
  runtimeVersion: string;
  message: string;
  fingerprintSha256: string;
  assetCount: number;
  rolloutPercentage: OtaUpdatePlan['rolloutPercentage'];
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_ota_plan', {
    p_hotfix_id: input.hotfixId,
    p_channel: input.channel,
    p_runtime_version: input.runtimeVersion.trim(),
    p_message: input.message.trim(),
    p_fingerprint_sha256: input.fingerprintSha256.trim(),
    p_asset_count: input.assetCount,
    p_rollout_percentage: input.rolloutPercentage,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('ota_plan_id_missing');
  return data;
}

export async function decideOtaUpdatePlan(
  planId: string,
  decision: ApprovalDecision,
  comment: string | null,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_decide_ota_plan', {
    p_plan_id: planId,
    p_decision: decision,
    p_comment: comment,
  });
  if (error) throw error;
}

export async function recordOtaPublication(planId: string, updateGroupId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_record_ota_publication', {
    p_plan_id: planId,
    p_update_group_id: updateGroupId.trim(),
  });
  if (error) throw error;
}

export async function rollbackMaintenanceHotfix(hotfixId: string, reason: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_rollback_hotfix', {
    p_hotfix_id: hotfixId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}

export async function listOperationsRetentionRuns(): Promise<OperationsRetentionRun[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('operations_retention_runs')
    .select('id, policy_version, dry_run, health_cutoff, audit_cutoff, incident_update_cutoff, eligible_health_count, eligible_audit_count, eligible_incident_update_count, deleted_health_count, deleted_audit_count, deleted_incident_update_count, status, executed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    policyVersion: row.policy_version,
    dryRun: Boolean(row.dry_run),
    healthCutoff: row.health_cutoff,
    auditCutoff: row.audit_cutoff,
    incidentUpdateCutoff: row.incident_update_cutoff,
    eligibleHealthCount: Number(row.eligible_health_count),
    eligibleAuditCount: Number(row.eligible_audit_count),
    eligibleIncidentUpdateCount: Number(row.eligible_incident_update_count),
    deletedHealthCount: Number(row.deleted_health_count),
    deletedAuditCount: Number(row.deleted_audit_count),
    deletedIncidentUpdateCount: Number(row.deleted_incident_update_count),
    status: row.status as OperationsRetentionRun['status'],
    executedAt: row.executed_at,
    createdAt: row.created_at,
  }));
}

export async function runOperationsRetention(dryRun: boolean): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('admin_run_operations_retention', { p_dry_run: dryRun });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('retention_run_id_missing');
  return data;
}

export async function setIncidentLegalHold(incidentId: string, legalHold: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_set_incident_legal_hold', {
    p_incident_id: incidentId,
    p_legal_hold: legalHold,
  });
  if (error) throw error;
}
