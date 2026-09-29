import { supabase } from '@/services/supabase';

export type ProductSlo = {
  id: string;
  serviceKey: string;
  name: string;
  description: string | null;
  objectivePct: number;
  evaluationWindowDays: number;
  warningBurnRate: number;
  criticalBurnRate: number;
  active: boolean;
  updatedAt: string;
};

export type SloMeasurement = {
  id: string;
  sloId: string;
  windowStart: string;
  windowEnd: string;
  goodEvents: number;
  totalEvents: number;
  observedPct: number;
  burnRate: number;
  errorBudgetConsumedPct: number;
  source: 'aggregated' | 'manual_review';
  createdAt: string;
};

export type PostmortemStatus = 'draft' | 'review' | 'approved' | 'rejected';
export type PostmortemReport = {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  rootCause: string;
  detection: string;
  resolution: string;
  customerImpact: string | null;
  lessons: string | null;
  status: PostmortemStatus;
  createdBy: string;
  approvedAt: string | null;
  updatedAt: string;
};

export type CorrectivePriority = 'critical' | 'high' | 'medium' | 'low';
export type CorrectiveStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type CorrectiveAction = {
  id: string;
  postmortemId: string;
  title: string;
  description: string | null;
  priority: CorrectivePriority;
  status: CorrectiveStatus;
  ownerUserId: string;
  dueAt: string;
  verification: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type CapacityCostSnapshot = {
  id: string;
  periodStart: string;
  periodEnd: string;
  activeAccounts: number;
  syncOperations: number;
  storageMegabytes: number;
  notificationDeliveries: number;
  estimatedCostBrl: number;
  budgetBrl: number;
  source: 'aggregated' | 'manual_review';
  createdAt: string;
};

export type MaintenanceImpact = 'none' | 'degraded' | 'unavailable';
export type MaintenanceStatus = 'planned' | 'awaiting_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type MaintenanceWindow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  customerImpact: MaintenanceImpact;
  status: MaintenanceStatus;
  notes: string | null;
  createdBy: string;
  approvedAt: string | null;
  updatedAt: string;
};

export type DependencyUpdateType = 'patch' | 'minor' | 'major' | 'security';
export type DependencyRisk = 'critical' | 'high' | 'medium' | 'low';
export type DependencyStatus = 'proposed' | 'approved' | 'in_progress' | 'validated' | 'deployed' | 'deferred' | 'rejected';
export type DependencyReview = {
  id: string;
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  updateType: DependencyUpdateType;
  riskLevel: DependencyRisk;
  status: DependencyStatus;
  dueAt: string | null;
  notes: string | null;
  updatedAt: string;
};

export type ProductCycleStatus = 'planning' | 'awaiting_approval' | 'approved' | 'active' | 'frozen' | 'released' | 'cancelled' | 'rejected';
export type ProductCycle = {
  id: string;
  version: string;
  title: string;
  goals: string;
  status: ProductCycleStatus;
  startsAt: string | null;
  targetReleaseAt: string | null;
  createdBy: string;
  approvedAt: string | null;
  updatedAt: string;
};

function requireSupabase() {
  if (!supabase) throw new Error('supabase_not_configured');
  return supabase;
}

export async function listProductSlos(): Promise<ProductSlo[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('product_slos')
    .select('id, service_key, name, description, objective_pct, evaluation_window_days, warning_burn_rate, critical_burn_rate, active, updated_at')
    .order('service_key');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    serviceKey: row.service_key,
    name: row.name,
    description: row.description,
    objectivePct: Number(row.objective_pct),
    evaluationWindowDays: Number(row.evaluation_window_days),
    warningBurnRate: Number(row.warning_burn_rate),
    criticalBurnRate: Number(row.critical_burn_rate),
    active: Boolean(row.active),
    updatedAt: row.updated_at,
  }));
}

export async function upsertProductSlo(input: {
  serviceKey: string;
  name: string;
  description: string | null;
  objectivePct: number;
  evaluationWindowDays: number;
  warningBurnRate: number;
  criticalBurnRate: number;
  active: boolean;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_upsert_product_slo', {
    p_service_key: input.serviceKey,
    p_name: input.name,
    p_description: input.description,
    p_objective_pct: input.objectivePct,
    p_evaluation_window_days: input.evaluationWindowDays,
    p_warning_burn_rate: input.warningBurnRate,
    p_critical_burn_rate: input.criticalBurnRate,
    p_active: input.active,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('product_slo_id_missing');
  return data;
}

export async function listSloMeasurements(sloId?: string): Promise<SloMeasurement[]> {
  const client = requireSupabase();
  let query = client.from('slo_measurements')
    .select('id, slo_id, window_start, window_end, good_events, total_events, observed_pct, burn_rate, error_budget_consumed_pct, source, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (sloId) query = query.eq('slo_id', sloId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    sloId: row.slo_id,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    goodEvents: Number(row.good_events),
    totalEvents: Number(row.total_events),
    observedPct: Number(row.observed_pct),
    burnRate: Number(row.burn_rate),
    errorBudgetConsumedPct: Number(row.error_budget_consumed_pct),
    source: row.source as SloMeasurement['source'],
    createdAt: row.created_at,
  }));
}

export async function recordSloMeasurement(input: {
  sloId: string;
  windowStart: string;
  windowEnd: string;
  goodEvents: number;
  totalEvents: number;
  source: SloMeasurement['source'];
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_record_slo_measurement', {
    p_slo_id: input.sloId,
    p_window_start: input.windowStart,
    p_window_end: input.windowEnd,
    p_good_events: input.goodEvents,
    p_total_events: input.totalEvents,
    p_source: input.source,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('slo_measurement_id_missing');
  return data;
}

export async function listPostmortems(): Promise<PostmortemReport[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('postmortem_reports')
    .select('id, incident_id, title, summary, root_cause, detection, resolution, customer_impact, lessons, status, created_by, approved_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    incidentId: row.incident_id,
    title: row.title,
    summary: row.summary,
    rootCause: row.root_cause,
    detection: row.detection,
    resolution: row.resolution,
    customerImpact: row.customer_impact,
    lessons: row.lessons,
    status: row.status as PostmortemStatus,
    createdBy: row.created_by,
    approvedAt: row.approved_at,
    updatedAt: row.updated_at,
  }));
}

export async function createPostmortem(input: {
  incidentId: string;
  title: string;
  summary: string;
  rootCause: string;
  detection: string;
  resolution: string;
  customerImpact: string | null;
  lessons: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_postmortem', {
    p_incident_id: input.incidentId,
    p_title: input.title,
    p_summary: input.summary,
    p_root_cause: input.rootCause,
    p_detection: input.detection,
    p_resolution: input.resolution,
    p_customer_impact: input.customerImpact,
    p_lessons: input.lessons,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('postmortem_id_missing');
  return data;
}

export async function requestPostmortemReview(postmortemId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_request_postmortem_review', { p_postmortem_id: postmortemId });
  if (error) throw error;
}

export async function decidePostmortem(postmortemId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_decide_postmortem', { p_postmortem_id: postmortemId, p_decision: decision });
  if (error) throw error;
}

export async function listCorrectiveActions(): Promise<CorrectiveAction[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('corrective_actions')
    .select('id, postmortem_id, title, description, priority, status, owner_user_id, due_at, verification, completed_at, updated_at')
    .order('due_at')
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    postmortemId: row.postmortem_id,
    title: row.title,
    description: row.description,
    priority: row.priority as CorrectivePriority,
    status: row.status as CorrectiveStatus,
    ownerUserId: row.owner_user_id,
    dueAt: row.due_at,
    verification: row.verification,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }));
}

export async function createCorrectiveAction(input: {
  postmortemId: string;
  title: string;
  description: string | null;
  priority: CorrectivePriority;
  ownerUserId: string;
  dueAt: string;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_corrective_action', {
    p_postmortem_id: input.postmortemId,
    p_title: input.title,
    p_description: input.description,
    p_priority: input.priority,
    p_owner_user_id: input.ownerUserId,
    p_due_at: input.dueAt,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('corrective_action_id_missing');
  return data;
}

export async function updateCorrectiveAction(actionId: string, status: CorrectiveStatus, verification: string | null): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_update_corrective_action', {
    p_action_id: actionId,
    p_status: status,
    p_verification: verification,
  });
  if (error) throw error;
}

export async function listCapacityCostSnapshots(): Promise<CapacityCostSnapshot[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('capacity_cost_snapshots')
    .select('id, period_start, period_end, active_accounts, sync_operations, storage_megabytes, notification_deliveries, estimated_cost_brl, budget_brl, source, created_at')
    .order('period_end', { ascending: false })
    .limit(24);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    activeAccounts: Number(row.active_accounts),
    syncOperations: Number(row.sync_operations),
    storageMegabytes: Number(row.storage_megabytes),
    notificationDeliveries: Number(row.notification_deliveries),
    estimatedCostBrl: Number(row.estimated_cost_brl),
    budgetBrl: Number(row.budget_brl),
    source: row.source as CapacityCostSnapshot['source'],
    createdAt: row.created_at,
  }));
}

export async function recordCapacityCost(input: Omit<CapacityCostSnapshot, 'id' | 'createdAt'>): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_record_capacity_cost', {
    p_period_start: input.periodStart,
    p_period_end: input.periodEnd,
    p_active_accounts: input.activeAccounts,
    p_sync_operations: input.syncOperations,
    p_storage_megabytes: input.storageMegabytes,
    p_notification_deliveries: input.notificationDeliveries,
    p_estimated_cost_brl: input.estimatedCostBrl,
    p_budget_brl: input.budgetBrl,
    p_source: input.source,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('capacity_cost_id_missing');
  return data;
}

export async function listMaintenanceWindows(): Promise<MaintenanceWindow[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('maintenance_windows')
    .select('id, title, starts_at, ends_at, customer_impact, status, notes, created_by, approved_at, updated_at')
    .order('starts_at')
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    customerImpact: row.customer_impact as MaintenanceImpact,
    status: row.status as MaintenanceStatus,
    notes: row.notes,
    createdBy: row.created_by,
    approvedAt: row.approved_at,
    updatedAt: row.updated_at,
  }));
}

export async function createMaintenanceWindow(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  customerImpact: MaintenanceImpact;
  notes: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_maintenance_window', {
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_customer_impact: input.customerImpact,
    p_notes: input.notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('maintenance_window_id_missing');
  return data;
}

export async function requestMaintenanceApproval(windowId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_request_maintenance_approval', { p_window_id: windowId });
  if (error) throw error;
}

export async function decideMaintenanceWindow(windowId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_decide_maintenance_window', { p_window_id: windowId, p_decision: decision });
  if (error) throw error;
}

export async function listDependencyReviews(): Promise<DependencyReview[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('dependency_reviews')
    .select('id, package_name, current_version, target_version, update_type, risk_level, status, due_at, notes, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    packageName: row.package_name,
    currentVersion: row.current_version,
    targetVersion: row.target_version,
    updateType: row.update_type as DependencyUpdateType,
    riskLevel: row.risk_level as DependencyRisk,
    status: row.status as DependencyStatus,
    dueAt: row.due_at,
    notes: row.notes,
    updatedAt: row.updated_at,
  }));
}

export async function createDependencyReview(input: {
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  updateType: DependencyUpdateType;
  riskLevel: DependencyRisk;
  dueAt: string | null;
  notes: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_dependency_review', {
    p_package_name: input.packageName,
    p_current_version: input.currentVersion,
    p_target_version: input.targetVersion,
    p_update_type: input.updateType,
    p_risk_level: input.riskLevel,
    p_due_at: input.dueAt,
    p_notes: input.notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('dependency_review_id_missing');
  return data;
}

export async function updateDependencyReview(reviewId: string, status: DependencyStatus, notes: string | null): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_update_dependency_review', {
    p_review_id: reviewId,
    p_status: status,
    p_notes: notes,
  });
  if (error) throw error;
}

export async function listProductCycles(): Promise<ProductCycle[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('product_cycles')
    .select('id, version, title, goals, status, starts_at, target_release_at, created_by, approved_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    version: row.version,
    title: row.title,
    goals: row.goals,
    status: row.status as ProductCycleStatus,
    startsAt: row.starts_at,
    targetReleaseAt: row.target_release_at,
    createdBy: row.created_by,
    approvedAt: row.approved_at,
    updatedAt: row.updated_at,
  }));
}

export async function createProductCycle(input: {
  version: string;
  title: string;
  goals: string;
  startsAt: string | null;
  targetReleaseAt: string | null;
}): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('operator_create_product_cycle', {
    p_version: input.version,
    p_title: input.title,
    p_goals: input.goals,
    p_starts_at: input.startsAt,
    p_target_release_at: input.targetReleaseAt,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('product_cycle_id_missing');
  return data;
}

export async function requestCycleApproval(cycleId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_request_cycle_approval', { p_cycle_id: cycleId });
  if (error) throw error;
}

export async function decideProductCycle(cycleId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_decide_product_cycle', { p_cycle_id: cycleId, p_decision: decision });
  if (error) throw error;
}

export async function updateProductCycleStatus(cycleId: string, status: 'active' | 'frozen' | 'released' | 'cancelled'): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('operator_update_product_cycle_status', { p_cycle_id: cycleId, p_status: status });
  if (error) throw error;
}
