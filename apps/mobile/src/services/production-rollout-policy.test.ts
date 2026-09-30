import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ProductionHealthSnapshot,
  ProductionIncident,
  ProductionRollout,
} from '@/data/production-operations-repository';
import { evaluateProductionRollout } from '@/services/production-rollout-policy';

const now = new Date('2026-07-26T12:00:00.000Z');
const rollout: ProductionRollout = { id:'rollout-1',candidateId:'candidate-1',submissionId:'submission-1',store:'google_play',track:'production',targetPercent:5,status:'active',notes:null,startedAt:'2026-07-26T08:00:00.000Z',completedAt:null,rolledBackAt:null,updatedAt:'2026-07-26T08:00:00.000Z' };
const healthy: ProductionHealthSnapshot = { id:'health-1',rolloutId:rollout.id,windowStart:'2026-07-26T08:00:00.000Z',windowEnd:'2026-07-26T11:00:00.000Z',source:'aggregated',crashFreeSessionsPct:99.8,syncSuccessPct:99,authSuccessPct:99.5,notificationSuccessPct:98,supportTicketCount:2,blockerCount:0,sampledSessions:500,createdAt:'2026-07-26T11:05:00.000Z' };
const criticalIncident: ProductionIncident = { id:'incident-1',candidateId:rollout.candidateId,rolloutId:rollout.id,severity:'sev1',status:'open',title:'Falha de autenticação em produção',summary:'Sessões não conseguem concluir a autenticação.',technicalImpact:'Acesso indisponível para parte da base.',startedAt:'2026-07-26T10:00:00.000Z',resolvedAt:null,updatedAt:'2026-07-26T10:00:00.000Z' };

test('libera avanço quando saúde agregada está atual e sem incidentes críticos',()=>{const result=evaluateProductionRollout({rollout,targetPercent:10,latestHealth:healthy,incidents:[],now});assert.equal(result.eligible,true);assert.deepEqual(result.blockers,[])});
test('bloqueia avanço sem leitura agregada',()=>{const result=evaluateProductionRollout({rollout,targetPercent:10,latestHealth:null,incidents:[],now});assert.equal(result.eligible,false);assert.ok(result.blockers.some(item=>item.includes('leitura agregada')))});
test('bloqueia métricas abaixo dos limites internos',()=>{const result=evaluateProductionRollout({rollout,targetPercent:10,latestHealth:{...healthy,crashFreeSessionsPct:98.9,syncSuccessPct:96.9,authSuccessPct:97.9,blockerCount:2},incidents:[],now});assert.equal(result.eligible,false);assert.equal(result.blockers.length,4)});
test('bloqueia incidente crítico ainda aberto',()=>{const result=evaluateProductionRollout({rollout,targetPercent:10,latestHealth:healthy,incidents:[criticalIncident],now});assert.equal(result.eligible,false);assert.ok(result.blockers.some(item=>item.includes('crítico')))});
test('ignora incidente crítico resolvido',()=>{const result=evaluateProductionRollout({rollout,targetPercent:10,latestHealth:healthy,incidents:[{...criticalIncident,status:'resolved',resolvedAt:'2026-07-26T11:30:00.000Z'}],now});assert.equal(result.eligible,true)});
test('bloqueia leitura com mais de 24 horas',()=>{const result=evaluateProductionRollout({rollout,targetPercent:10,latestHealth:{...healthy,createdAt:'2026-07-25T11:00:00.000Z'},incidents:[],now});assert.equal(result.eligible,false);assert.ok(result.blockers.some(item=>item.includes('vencida')))});
