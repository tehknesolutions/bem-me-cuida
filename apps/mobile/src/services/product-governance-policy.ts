export type SloHealth = 'no_data' | 'healthy' | 'warning' | 'critical';

export type SloEvaluation = {
  observedPct: number | null;
  burnRate: number | null;
  errorBudgetConsumedPct: number | null;
  errorBudgetRemainingPct: number | null;
  health: SloHealth;
};

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function evaluateSlo(input: {
  objectivePct: number;
  goodEvents: number;
  totalEvents: number;
  warningBurnRate: number;
  criticalBurnRate: number;
}): SloEvaluation {
  if (input.totalEvents <= 0 || input.goodEvents < 0 || input.goodEvents > input.totalEvents) {
    return { observedPct: null, burnRate: null, errorBudgetConsumedPct: null, errorBudgetRemainingPct: null, health: 'no_data' };
  }
  const observedPct = (input.goodEvents / input.totalEvents) * 100;
  const allowedFailurePct = 100 - input.objectivePct;
  const actualFailurePct = Math.max(0, 100 - observedPct);
  const burnRate = allowedFailurePct > 0 ? actualFailurePct / allowedFailurePct : Number.POSITIVE_INFINITY;
  const consumed = burnRate * 100;
  const remaining = Math.max(0, 100 - consumed);
  const health: SloHealth = burnRate >= input.criticalBurnRate ? 'critical' : burnRate >= input.warningBurnRate ? 'warning' : 'healthy';
  return { observedPct: rounded(observedPct, 4), burnRate: rounded(burnRate, 4), errorBudgetConsumedPct: rounded(consumed, 2), errorBudgetRemainingPct: rounded(remaining, 2), health };
}

export type CostEvaluation = { varianceBrl: number; variancePct: number | null; status: 'within_budget' | 'attention' | 'over_budget' };
export function evaluateCost(estimatedCostBrl: number, budgetBrl: number): CostEvaluation {
  const varianceBrl = rounded(estimatedCostBrl - budgetBrl, 2);
  const variancePct = budgetBrl > 0 ? rounded((varianceBrl / budgetBrl) * 100, 2) : null;
  const status = varianceBrl <= 0 ? 'within_budget' : variancePct !== null && variancePct <= 10 ? 'attention' : 'over_budget';
  return { varianceBrl, variancePct, status };
}

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export function postmortemDueAt(startedAt: string, severity: IncidentSeverity): string {
  const days = severity === 'sev1' ? 2 : severity === 'sev2' ? 5 : severity === 'sev3' ? 10 : 30;
  const due = new Date(startedAt); due.setUTCDate(due.getUTCDate() + days); return due.toISOString();
}
export function isPostmortemOverdue(input: { incidentStartedAt: string; severity: IncidentSeverity; postmortemStatus: 'missing' | 'draft' | 'review' | 'approved' | 'rejected'; now?: string }): boolean {
  if (input.postmortemStatus === 'approved') return false;
  return new Date(input.now ?? new Date().toISOString()).getTime() > new Date(postmortemDueAt(input.incidentStartedAt, input.severity)).getTime();
}
export type CycleReadiness = { ready: boolean; blockers: string[] };
export function evaluateCycleReadiness(input: { criticalIncidentsOpen: number; criticalActionsOpen: number; highActionsOverdue: number; securityDependenciesOpen: number; criticalSlos: number; maintenanceWindowsUnapproved: number }): CycleReadiness {
  const blockers: string[] = [];
  if (input.criticalIncidentsOpen > 0) blockers.push(`${input.criticalIncidentsOpen} incidente(s) crítico(s) aberto(s)`);
  if (input.criticalActionsOpen > 0) blockers.push(`${input.criticalActionsOpen} ação(ões) corretiva(s) crítica(s) aberta(s)`);
  if (input.highActionsOverdue > 0) blockers.push(`${input.highActionsOverdue} ação(ões) de alta prioridade vencida(s)`);
  if (input.securityDependenciesOpen > 0) blockers.push(`${input.securityDependenciesOpen} atualização(ões) de segurança pendente(s)`);
  if (input.criticalSlos > 0) blockers.push(`${input.criticalSlos} SLO(s) em estado crítico`);
  if (input.maintenanceWindowsUnapproved > 0) blockers.push(`${input.maintenanceWindowsUnapproved} manutenção(ões) sem aprovação`);
  return { ready: blockers.length === 0, blockers };
}
export function maintenanceWindowsOverlap(first: { startsAt: string; endsAt: string }, second: { startsAt: string; endsAt: string }): boolean {
  return new Date(first.startsAt).getTime() < new Date(second.endsAt).getTime() && new Date(second.startsAt).getTime() < new Date(first.endsAt).getTime();
}
