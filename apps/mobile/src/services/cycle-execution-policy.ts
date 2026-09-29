import type {
  CycleBacklogItem,
  CycleReleaseGate,
  CycleScopeChange,
  DeliveryMilestone,
  ExperimentMeasurement,
  ProductExperiment,
} from '@/data/cycle-execution-repository';

export function calculateBacklogPriority(input: {
  impactScore: number;
  confidenceScore: number;
  effortPoints: number;
  riskScore: number;
}): number {
  const effort = Math.max(1, input.effortPoints);
  return Number((((input.impactScore * input.confidenceScore) / effort) - input.riskScore).toFixed(4));
}

export type ExperimentEvaluation = {
  status: 'insufficient_sample' | 'guardrail_failed' | 'neutral' | 'promising';
  controlConversionPct: number;
  treatmentConversionPct: number;
  upliftPct: number;
  treatmentGuardrailPct: number;
};

function aggregate(measurements: ExperimentMeasurement[], variant: 'control' | 'treatment') {
  return measurements.filter((item) => item.variant === variant).reduce(
    (acc, item) => ({
      sampleSize: acc.sampleSize + item.sampleSize,
      conversions: acc.conversions + item.conversions,
      guardrailBreaches: acc.guardrailBreaches + item.guardrailBreaches,
    }),
    { sampleSize: 0, conversions: 0, guardrailBreaches: 0 },
  );
}

export function evaluateExperiment(measurements: ExperimentMeasurement[]): ExperimentEvaluation {
  const control = aggregate(measurements, 'control');
  const treatment = aggregate(measurements, 'treatment');
  const controlConversionPct = control.sampleSize > 0 ? (control.conversions / control.sampleSize) * 100 : 0;
  const treatmentConversionPct = treatment.sampleSize > 0 ? (treatment.conversions / treatment.sampleSize) * 100 : 0;
  const upliftPct = controlConversionPct > 0
    ? ((treatmentConversionPct - controlConversionPct) / controlConversionPct) * 100
    : 0;
  const treatmentGuardrailPct = treatment.sampleSize > 0 ? (treatment.guardrailBreaches / treatment.sampleSize) * 100 : 0;

  let status: ExperimentEvaluation['status'] = 'neutral';
  if (control.sampleSize < 100 || treatment.sampleSize < 100) status = 'insufficient_sample';
  else if (treatmentGuardrailPct > 2) status = 'guardrail_failed';
  else if (upliftPct >= 5) status = 'promising';

  return {
    status,
    controlConversionPct: Number(controlConversionPct.toFixed(2)),
    treatmentConversionPct: Number(treatmentConversionPct.toFixed(2)),
    upliftPct: Number(upliftPct.toFixed(2)),
    treatmentGuardrailPct: Number(treatmentGuardrailPct.toFixed(2)),
  };
}

export type CycleExecutionEvaluation = { ready: boolean; blockers: string[] };

export function evaluateCycleExecution(input: {
  targetStatus: 'frozen' | 'released';
  backlog: CycleBacklogItem[];
  scopeChanges: CycleScopeChange[];
  experiments: ProductExperiment[];
  milestones: DeliveryMilestone[];
  gates: CycleReleaseGate[];
}): CycleExecutionEvaluation {
  const blockers: string[] = [];
  if (input.scopeChanges.some((item) => item.status === 'pending')) blockers.push('scope_changes_pending');
  if (input.experiments.some((item) => ['awaiting_approval', 'running', 'paused'].includes(item.status))) blockers.push('experiments_open');
  if (input.backlog.some((item) => item.status === 'blocked')) blockers.push('backlog_blocked');
  if (input.gates.some((item) => item.required && !['passed', 'waived'].includes(item.status))) blockers.push('required_gates_pending');
  if (!input.milestones.some((item) => item.milestoneKind === 'rc' && item.status === 'done')) blockers.push('rc_milestone_pending');

  if (input.targetStatus === 'released') {
    if (input.backlog.some((item) => ['committed', 'in_progress', 'blocked'].includes(item.status))) blockers.push('committed_backlog_incomplete');
    if (!input.milestones.some((item) => item.milestoneKind === 'release' && item.status === 'done')) blockers.push('release_milestone_pending');
  }

  return { ready: blockers.length === 0, blockers };
}
