import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCost, evaluateCycleReadiness, evaluateSlo, isPostmortemOverdue, maintenanceWindowsOverlap, postmortemDueAt } from './product-governance-policy';

test('SLO sem amostra retorna no_data', () => { assert.deepEqual(evaluateSlo({ objectivePct: 99, goodEvents: 0, totalEvents: 0, warningBurnRate: 1, criticalBurnRate: 2 }), { observedPct: null, burnRate: null, errorBudgetConsumedPct: null, errorBudgetRemainingPct: null, health: 'no_data' }); });
test('SLO saudável preserva orçamento de erro', () => { const result=evaluateSlo({ objectivePct:99,goodEvents:9995,totalEvents:10000,warningBurnRate:1,criticalBurnRate:2 }); assert.equal(result.observedPct,99.95); assert.equal(result.burnRate,0.05); assert.equal(result.errorBudgetConsumedPct,5); assert.equal(result.errorBudgetRemainingPct,95); assert.equal(result.health,'healthy'); });
test('SLO entra em alerta ao consumir uma vez o orçamento',()=>{const result=evaluateSlo({objectivePct:99,goodEvents:9900,totalEvents:10000,warningBurnRate:1,criticalBurnRate:2});assert.equal(result.burnRate,1);assert.equal(result.health,'warning')});
test('SLO fica crítico com burn rate acima do limite',()=>{const result=evaluateSlo({objectivePct:99,goodEvents:9700,totalEvents:10000,warningBurnRate:1,criticalBurnRate:2});assert.equal(result.burnRate,3);assert.equal(result.errorBudgetRemainingPct,0);assert.equal(result.health,'critical')});
test('custo abaixo do orçamento fica controlado',()=>{assert.deepEqual(evaluateCost(900,1000),{varianceBrl:-100,variancePct:-10,status:'within_budget'})});
test('custo até dez por cento acima exige atenção',()=>{assert.deepEqual(evaluateCost(1080,1000),{varianceBrl:80,variancePct:8,status:'attention'})});
test('custo acima de dez por cento estoura orçamento',()=>{assert.deepEqual(evaluateCost(1250,1000),{varianceBrl:250,variancePct:25,status:'over_budget'})});
test('SEV1 exige pós-incidente em dois dias',()=>{assert.equal(postmortemDueAt('2026-07-01T12:00:00.000Z','sev1'),'2026-07-03T12:00:00.000Z')});
test('pós-incidente aprovado nunca é considerado vencido',()=>{assert.equal(isPostmortemOverdue({incidentStartedAt:'2026-07-01T00:00:00.000Z',severity:'sev1',postmortemStatus:'approved',now:'2026-08-01T00:00:00.000Z'}),false)});
test('ciclo sem bloqueios fica pronto',()=>{assert.deepEqual(evaluateCycleReadiness({criticalIncidentsOpen:0,criticalActionsOpen:0,highActionsOverdue:0,securityDependenciesOpen:0,criticalSlos:0,maintenanceWindowsUnapproved:0}),{ready:true,blockers:[]})});
test('ciclo apresenta todos os bloqueadores',()=>{const result=evaluateCycleReadiness({criticalIncidentsOpen:1,criticalActionsOpen:2,highActionsOverdue:3,securityDependenciesOpen:1,criticalSlos:1,maintenanceWindowsUnapproved:2});assert.equal(result.ready,false);assert.equal(result.blockers.length,6)});
test('detecta sobreposição de janelas de manutenção',()=>{assert.equal(maintenanceWindowsOverlap({startsAt:'2026-07-10T10:00:00.000Z',endsAt:'2026-07-10T12:00:00.000Z'},{startsAt:'2026-07-10T11:00:00.000Z',endsAt:'2026-07-10T13:00:00.000Z'}),true)});
