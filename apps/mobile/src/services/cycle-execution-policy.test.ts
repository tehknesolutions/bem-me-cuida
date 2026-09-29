import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  CycleBacklogItem,
  CycleReleaseGate,
  CycleScopeChange,
  DeliveryMilestone,
  ExperimentMeasurement,
  ProductExperiment,
} from '@/data/cycle-execution-repository';
import { calculateBacklogPriority, evaluateCycleExecution, evaluateExperiment } from './cycle-execution-policy';

test('calculateBacklogPriority recompensa impacto e confiança e penaliza esforço e risco', () => {
  assert.equal(calculateBacklogPriority({ impactScore: 90, confidenceScore: 80, effortPoints: 8, riskScore: 20 }), 880);
  assert.ok(calculateBacklogPriority({ impactScore: 90, confidenceScore: 80, effortPoints: 4, riskScore: 20 }) > 880);
});

test('evaluateExperiment exige amostra mínima por variante', () => {
  const measurements: ExperimentMeasurement[] = [
    { id: '1', experimentId: 'e', variant: 'control', periodStart: '', periodEnd: '', sampleSize: 99, conversions: 20, valueSum: 0, guardrailBreaches: 0, source: 'aggregated', recordedAt: '' },
    { id: '2', experimentId: 'e', variant: 'treatment', periodStart: '', periodEnd: '', sampleSize: 120, conversions: 30, valueSum: 0, guardrailBreaches: 0, source: 'aggregated', recordedAt: '' },
  ];
  assert.equal(evaluateExperiment(measurements).status, 'insufficient_sample');
});

test('evaluateExperiment bloqueia quando guardrail do tratamento ultrapassa 2%', () => {
  const measurements: ExperimentMeasurement[] = [
    { id: '1', experimentId: 'e', variant: 'control', periodStart: '', periodEnd: '', sampleSize: 200, conversions: 40, valueSum: 0, guardrailBreaches: 1, source: 'aggregated', recordedAt: '' },
    { id: '2', experimentId: 'e', variant: 'treatment', periodStart: '', periodEnd: '', sampleSize: 200, conversions: 50, valueSum: 0, guardrailBreaches: 5, source: 'aggregated', recordedAt: '' },
  ];
  assert.equal(evaluateExperiment(measurements).status, 'guardrail_failed');
});

test('evaluateExperiment marca resultado promissor com ganho mínimo de 5%', () => {
  const measurements: ExperimentMeasurement[] = [
    { id: '1', experimentId: 'e', variant: 'control', periodStart: '', periodEnd: '', sampleSize: 200, conversions: 40, valueSum: 0, guardrailBreaches: 1, source: 'aggregated', recordedAt: '' },
    { id: '2', experimentId: 'e', variant: 'treatment', periodStart: '', periodEnd: '', sampleSize: 200, conversions: 50, valueSum: 0, guardrailBreaches: 2, source: 'aggregated', recordedAt: '' },
  ];
  const result = evaluateExperiment(measurements);
  assert.equal(result.status, 'promising');
  assert.equal(result.upliftPct, 25);
});

const backlog = (status: CycleBacklogItem['status']): CycleBacklogItem => ({
  id: 'b', cycleId: 'c', title: 'x', description: '', category: 'reliability', impactScore: 80, confidenceScore: 80,
  effortPoints: 5, riskScore: 20, priorityScore: 1260, status, ownerId: null, dueAt: null, updatedAt: '',
});
const experiment = (status: ProductExperiment['status']): ProductExperiment => ({
  id: 'e', cycleId: 'c', experimentKey: 'test_exp', title: 'x', hypothesis: 'hipótese suficientemente longa para o teste', successMetric: 'adoção',
  guardrailMetric: 'falhas', audienceDescription: 'pessoas que consentiram explicitamente', consentRequired: true, status,
  startsAt: null, endsAt: null, createdBy: 'u', approvedAt: null, updatedAt: '',
});
const gate = (status: CycleReleaseGate['status']): CycleReleaseGate => ({
  id: 'g', cycleId: 'c', gateKey: 'quality_ci', label: 'CI', required: true, status, evidenceSummary: '', checkedAt: null, updatedAt: '',
});
const milestone = (kind: DeliveryMilestone['milestoneKind'], status: DeliveryMilestone['status']): DeliveryMilestone => ({
  id: kind, cycleId: 'c', title: kind, milestoneKind: kind, dueAt: '', status, ownerId: null, evidenceSummary: '', updatedAt: '',
});
const scopeChange = (status: CycleScopeChange['status']): CycleScopeChange => ({
  id: 's', cycleId: 'c', backlogItemId: null, changeType: 'add', reason: 'motivo válido para alterar o escopo', impactSummary: 'impacto técnico devidamente registrado',
  status, requestedBy: 'u', reviewedBy: null, reviewedAt: null, createdAt: '',
});

test('evaluateCycleExecution lista bloqueadores para congelamento', () => {
  const result = evaluateCycleExecution({
    targetStatus: 'frozen',
    backlog: [backlog('blocked')],
    scopeChanges: [scopeChange('pending')],
    experiments: [experiment('running')],
    milestones: [milestone('rc', 'planned')],
    gates: [gate('pending')],
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ['scope_changes_pending', 'experiments_open', 'backlog_blocked', 'required_gates_pending', 'rc_milestone_pending']);
});

test('evaluateCycleExecution exige backlog concluído e marco de release para lançamento', () => {
  const result = evaluateCycleExecution({
    targetStatus: 'released',
    backlog: [backlog('committed')],
    scopeChanges: [],
    experiments: [experiment('concluded')],
    milestones: [milestone('rc', 'done')],
    gates: [gate('passed')],
  });
  assert.deepEqual(result.blockers, ['committed_backlog_incomplete', 'release_milestone_pending']);
});

test('evaluateCycleExecution libera ciclo sem bloqueadores', () => {
  const result = evaluateCycleExecution({
    targetStatus: 'released',
    backlog: [backlog('done')],
    scopeChanges: [scopeChange('approved')],
    experiments: [experiment('concluded')],
    milestones: [milestone('rc', 'done'), milestone('release', 'done')],
    gates: [gate('passed')],
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
});
