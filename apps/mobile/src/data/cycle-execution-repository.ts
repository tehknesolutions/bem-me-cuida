import { supabase } from '@/services/supabase';

export type BacklogCategory = 'reliability' | 'accessibility' | 'value' | 'security' | 'operations';
export type BacklogStatus = 'proposed' | 'committed' | 'in_progress' | 'blocked' | 'done' | 'removed';
export type CycleBacklogItem = {
  id: string;
  cycleId: string;
  title: string;
  description: string;
  category: BacklogCategory;
  impactScore: number;
  confidenceScore: number;
  effortPoints: number;
  riskScore: number;
  priorityScore: number;
  status: BacklogStatus;
  ownerId: string | null;
  dueAt: string | null;
  updatedAt: string;
};

export type ObjectiveStatus = 'draft' | 'active' | 'achieved' | 'missed' | 'cancelled';
export type CycleObjective = { id: string; cycleId: string; title: string; description: string; weight: number; status: ObjectiveStatus; updatedAt: string };
export type KeyResultStatus = 'on_track' | 'at_risk' | 'achieved' | 'missed';
export type KeyResultUnit = 'count' | 'percentage' | 'rate' | 'hours' | 'currency_brl';
export type CycleKeyResult = {
  id: string; objectiveId: string; title: string; baselineValue: number; targetValue: number; currentValue: number;
  unit: KeyResultUnit; aggregationMode: 'latest' | 'sum' | 'average' | 'minimum' | 'maximum'; status: KeyResultStatus; updatedAt: string;
};

export type ScopeChangeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type CycleScopeChange = {
  id: string; cycleId: string; backlogItemId: string | null; changeType: 'add' | 'remove' | 'reorder' | 'resize';
  reason: string; impactSummary: string; status: ScopeChangeStatus; requestedBy: string; reviewedBy: string | null; reviewedAt: string | null; createdAt: string;
};

export type ExperimentStatus = 'draft' | 'awaiting_approval' | 'approved' | 'running' | 'paused' | 'concluded' | 'cancelled';
export type ProductExperiment = {
  id: string; cycleId: string; experimentKey: string; title: string; hypothesis: string; successMetric: string; guardrailMetric: string;
  audienceDescription: string; consentRequired: boolean; status: ExperimentStatus; startsAt: string | null; endsAt: string | null;
  createdBy: string; approvedAt: string | null; updatedAt: string;
};
export type ExperimentMeasurement = {
  id: string; experimentId: string; variant: 'control' | 'treatment'; periodStart: string; periodEnd: string; sampleSize: number;
  conversions: number; valueSum: number; guardrailBreaches: number; source: 'aggregated' | 'manual_review'; recordedAt: string;
};

export type MilestoneKind = 'planning' | 'design' | 'development' | 'qa' | 'rc' | 'freeze' | 'release';
export type MilestoneStatus = 'planned' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type DeliveryMilestone = {
  id: string; cycleId: string; title: string; milestoneKind: MilestoneKind; dueAt: string; status: MilestoneStatus;
  ownerId: string | null; evidenceSummary: string; updatedAt: string;
};

export type ReleaseGateStatus = 'pending' | 'passed' | 'failed' | 'waived';
export type CycleReleaseGate = {
  id: string; cycleId: string; gateKey: string; label: string; required: boolean; status: ReleaseGateStatus;
  evidenceSummary: string; checkedAt: string | null; updatedAt: string;
};

export type CycleExecutionBlockers = { targetStatus: 'frozen' | 'released'; ready: boolean; blockers: string[] };

function requireSupabase() {
  if (!supabase) throw new Error('supabase_not_configured');
  return supabase;
}

export async function listCycleBacklog(cycleId: string): Promise<CycleBacklogItem[]> {
  const { data, error } = await requireSupabase().from('cycle_backlog_items')
    .select('id,cycle_id,title,description,category,impact_score,confidence_score,effort_points,risk_score,priority_score,status,owner_id,due_at,updated_at')
    .eq('cycle_id', cycleId).order('priority_score', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, cycleId: row.cycle_id, title: row.title, description: row.description, category: row.category,
    impactScore: Number(row.impact_score), confidenceScore: Number(row.confidence_score), effortPoints: Number(row.effort_points),
    riskScore: Number(row.risk_score), priorityScore: Number(row.priority_score), status: row.status, ownerId: row.owner_id,
    dueAt: row.due_at, updatedAt: row.updated_at,
  }));
}

export async function upsertCycleBacklogItem(input: {
  cycleId: string; itemId?: string | null; title: string; description: string; category: BacklogCategory;
  impactScore: number; confidenceScore: number; effortPoints: number; riskScore: number; ownerId?: string | null; dueAt?: string | null;
}): Promise<string> {
  const { data, error } = await requireSupabase().rpc('operator_upsert_cycle_backlog_item', {
    p_cycle_id: input.cycleId, p_item_id: input.itemId ?? null, p_title: input.title, p_description: input.description,
    p_category: input.category, p_impact_score: input.impactScore, p_confidence_score: input.confidenceScore,
    p_effort_points: input.effortPoints, p_risk_score: input.riskScore, p_owner_id: input.ownerId ?? null, p_due_at: input.dueAt ?? null,
  });
  if (error) throw error;
  return String(data);
}

export async function updateCycleBacklogStatus(itemId: string, status: BacklogStatus): Promise<void> {
  const { error } = await requireSupabase().rpc('operator_update_cycle_backlog_status', { p_item_id: itemId, p_status: status });
  if (error) throw error;
}

export async function listCycleObjectives(cycleId: string): Promise<CycleObjective[]> {
  const { data, error } = await requireSupabase().from('cycle_objectives')
    .select('id,cycle_id,title,description,weight,status,updated_at').eq('cycle_id', cycleId).order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, cycleId: row.cycle_id, title: row.title, description: row.description, weight: Number(row.weight), status: row.status, updatedAt: row.updated_at }));
}

export async function listCycleKeyResults(objectiveIds: string[]): Promise<CycleKeyResult[]> {
  if (objectiveIds.length === 0) return [];
  const { data, error } = await requireSupabase().from('cycle_key_results')
    .select('id,objective_id,title,baseline_value,target_value,current_value,unit,aggregation_mode,status,updated_at')
    .in('objective_id', objectiveIds).order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, objectiveId: row.objective_id, title: row.title, baselineValue: Number(row.baseline_value), targetValue: Number(row.target_value),
    currentValue: Number(row.current_value), unit: row.unit, aggregationMode: row.aggregation_mode, status: row.status, updatedAt: row.updated_at,
  }));
}

export async function createCycleObjective(cycleId: string, title: string, description: string, weight = 100): Promise<string> {
  const { data, error } = await requireSupabase().rpc('operator_create_cycle_objective', { p_cycle_id: cycleId, p_title: title, p_description: description, p_weight: weight });
  if (error) throw error;
  return String(data);
}

export async function addCycleKeyResult(input: { objectiveId: string; title: string; baseline: number; target: number; unit: KeyResultUnit }): Promise<string> {
  const { data, error } = await requireSupabase().rpc('operator_add_cycle_key_result', {
    p_objective_id: input.objectiveId, p_title: input.title, p_baseline: input.baseline, p_target: input.target, p_unit: input.unit, p_aggregation_mode: 'latest',
  });
  if (error) throw error;
  return String(data);
}

export async function updateCycleKeyResult(keyResultId: string, current: number, status: KeyResultStatus): Promise<void> {
  const { error } = await requireSupabase().rpc('operator_update_cycle_key_result', { p_key_result_id: keyResultId, p_current: current, p_status: status });
  if (error) throw error;
}

export async function listScopeChanges(cycleId: string): Promise<CycleScopeChange[]> {
  const { data, error } = await requireSupabase().from('cycle_scope_changes')
    .select('id,cycle_id,backlog_item_id,change_type,reason,impact_summary,status,requested_by,reviewed_by,reviewed_at,created_at')
    .eq('cycle_id', cycleId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, cycleId: row.cycle_id, backlogItemId: row.backlog_item_id, changeType: row.change_type, reason: row.reason,
    impactSummary: row.impact_summary, status: row.status, requestedBy: row.requested_by, reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at, createdAt: row.created_at,
  }));
}

export async function requestScopeChange(input: { cycleId: string; backlogItemId?: string | null; changeType: CycleScopeChange['changeType']; reason: string; impactSummary: string }): Promise<string> {
  const { data, error } = await requireSupabase().rpc('operator_request_scope_change', {
    p_cycle_id: input.cycleId, p_backlog_item_id: input.backlogItemId ?? null, p_change_type: input.changeType,
    p_reason: input.reason, p_impact_summary: input.impactSummary,
  });
  if (error) throw error;
  return String(data);
}

export async function decideScopeChange(changeId: string, decision: 'approved' | 'rejected', comment?: string): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_decide_scope_change', { p_change_id: changeId, p_decision: decision, p_comment: comment ?? null });
  if (error) throw error;
}

export async function listProductExperiments(cycleId: string): Promise<ProductExperiment[]> {
  const { data, error } = await requireSupabase().from('product_experiments')
    .select('id,cycle_id,experiment_key,title,hypothesis,success_metric,guardrail_metric,audience_description,consent_required,status,starts_at,ends_at,created_by,approved_at,updated_at')
    .eq('cycle_id', cycleId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, cycleId: row.cycle_id, experimentKey: row.experiment_key, title: row.title, hypothesis: row.hypothesis,
    successMetric: row.success_metric, guardrailMetric: row.guardrail_metric, audienceDescription: row.audience_description,
    consentRequired: Boolean(row.consent_required), status: row.status, startsAt: row.starts_at, endsAt: row.ends_at,
    createdBy: row.created_by, approvedAt: row.approved_at, updatedAt: row.updated_at,
  }));
}

export async function createProductExperiment(input: {
  cycleId: string; experimentKey: string; title: string; hypothesis: string; successMetric: string; guardrailMetric: string;
  audienceDescription: string; startsAt?: string | null; endsAt?: string | null;
}): Promise<string> {
  const { data, error } = await requireSupabase().rpc('operator_create_experiment', {
    p_cycle_id: input.cycleId, p_experiment_key: input.experimentKey, p_title: input.title, p_hypothesis: input.hypothesis,
    p_success_metric: input.successMetric, p_guardrail_metric: input.guardrailMetric, p_audience_description: input.audienceDescription,
    p_starts_at: input.startsAt ?? null, p_ends_at: input.endsAt ?? null,
  });
  if (error) throw error;
  return String(data);
}

export async function requestExperimentApproval(experimentId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('operator_request_experiment_approval', { p_experiment_id: experimentId });
  if (error) throw error;
}

export async function decideExperiment(experimentId: string, decision: 'approved' | 'cancelled'): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_decide_experiment', { p_experiment_id: experimentId, p_decision: decision });
  if (error) throw error;
}

export async function updateExperimentStatus(experimentId: string, status: 'running' | 'paused' | 'concluded' | 'cancelled'): Promise<void> {
  const { error } = await requireSupabase().rpc('operator_update_experiment_status', { p_experiment_id: experimentId, p_status: status });
  if (error) throw error;
}

export async function listExperimentMeasurements(experimentId: string): Promise<ExperimentMeasurement[]> {
  const { data, error } = await requireSupabase().from('experiment_measurements')
    .select('id,experiment_id,variant,period_start,period_end,sample_size,conversions,value_sum,guardrail_breaches,source,recorded_at')
    .eq('experiment_id', experimentId).order('period_end', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, experimentId: row.experiment_id, variant: row.variant, periodStart: row.period_start, periodEnd: row.period_end,
    sampleSize: Number(row.sample_size), conversions: Number(row.conversions), valueSum: Number(row.value_sum),
    guardrailBreaches: Number(row.guardrail_breaches), source: row.source, recordedAt: row.recorded_at,
  }));
}

export async function recordExperimentMeasurement(input: {
  experimentId: string; variant: 'control' | 'treatment'; periodStart: string; periodEnd: string; sampleSize: number;
  conversions: number; valueSum: number; guardrailBreaches: number;
}): Promise<string> {
  const { data, error } = await requireSupabase().rpc('operator_record_experiment_measurement', {
    p_experiment_id: input.experimentId, p_variant: input.variant, p_period_start: input.periodStart, p_period_end: input.periodEnd,
    p_sample_size: input.sampleSize, p_conversions: input.conversions, p_value_sum: input.valueSum,
    p_guardrail_breaches: input.guardrailBreaches, p_source: 'aggregated',
  });
  if (error) throw error;
  return String(data);
}

export async function listDeliveryMilestones(cycleId: string): Promise<DeliveryMilestone[]> {
  const { data, error } = await requireSupabase().from('delivery_milestones')
    .select('id,cycle_id,title,milestone_kind,due_at,status,owner_id,evidence_summary,updated_at')
    .eq('cycle_id', cycleId).order('due_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, cycleId: row.cycle_id, title: row.title, milestoneKind: row.milestone_kind, dueAt: row.due_at,
    status: row.status, ownerId: row.owner_id, evidenceSummary: row.evidence_summary, updatedAt: row.updated_at,
  }));
}

export async function createDeliveryMilestone(input: { cycleId: string; title: string; kind: MilestoneKind; dueAt: string; ownerId?: string | null }): Promise<string> {
  const { data, error } = await requireSupabase().rpc('operator_create_delivery_milestone', {
    p_cycle_id: input.cycleId, p_title: input.title, p_kind: input.kind, p_due_at: input.dueAt, p_owner_id: input.ownerId ?? null,
  });
  if (error) throw error;
  return String(data);
}

export async function updateDeliveryMilestone(milestoneId: string, status: MilestoneStatus, evidence?: string): Promise<void> {
  const { error } = await requireSupabase().rpc('operator_update_delivery_milestone', {
    p_milestone_id: milestoneId, p_status: status, p_evidence_summary: evidence ?? null,
  });
  if (error) throw error;
}

export async function listCycleReleaseGates(cycleId: string): Promise<CycleReleaseGate[]> {
  const { data, error } = await requireSupabase().from('cycle_release_gates')
    .select('id,cycle_id,gate_key,label,required,status,evidence_summary,checked_at,updated_at')
    .eq('cycle_id', cycleId).order('required', { ascending: false }).order('gate_key');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, cycleId: row.cycle_id, gateKey: row.gate_key, label: row.label, required: Boolean(row.required),
    status: row.status, evidenceSummary: row.evidence_summary, checkedAt: row.checked_at, updatedAt: row.updated_at,
  }));
}

export async function initializeCycleReleaseGates(cycleId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('operator_initialize_cycle_release_gates', { p_cycle_id: cycleId });
  if (error) throw error;
}

export async function setCycleReleaseGate(gateId: string, status: ReleaseGateStatus, evidence?: string): Promise<void> {
  const { error } = await requireSupabase().rpc('operator_set_cycle_release_gate', { p_gate_id: gateId, p_status: status, p_evidence_summary: evidence ?? null });
  if (error) throw error;
}

export async function getCycleExecutionBlockers(cycleId: string, targetStatus: 'frozen' | 'released'): Promise<CycleExecutionBlockers> {
  const { data, error } = await requireSupabase().rpc('operator_get_cycle_execution_blockers', { p_cycle_id: cycleId, p_target_status: targetStatus });
  if (error) throw error;
  const value = data as { target_status?: string; ready?: boolean; blockers?: string[] } | null;
  return { targetStatus, ready: Boolean(value?.ready), blockers: Array.isArray(value?.blockers) ? value.blockers : [] };
}
