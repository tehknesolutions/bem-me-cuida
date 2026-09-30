import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateFourEyesApproval,
  evaluateOtaCompatibility,
  evaluateRetentionExecution,
  retentionMinimumDays,
} from './maintenance-policy';

test('libera OTA somente com runtime, canal e aprovação compatíveis', () => {
  const result = evaluateOtaCompatibility({
    kind: 'ota',
    status: 'approved',
    nativeChanges: false,
    requiresBinary: false,
    targetRuntimeVersion: '0.10.0',
    planRuntimeVersion: '0.10.0',
    targetChannel: 'production',
    planChannel: 'production',
    fingerprintSha256: 'a'.repeat(64),
    assetCount: 42,
    approvalCount: 1,
    rolloutPercentage: 5,
  });

  assert.equal(result.allowed, true);
  assert.deepEqual(result.blockers, []);
});

test('bloqueia OTA com mudança nativa ou runtime incompatível', () => {
  const result = evaluateOtaCompatibility({
    kind: 'ota',
    status: 'approved',
    nativeChanges: true,
    requiresBinary: false,
    targetRuntimeVersion: '0.10.0',
    planRuntimeVersion: '0.11.0',
    targetChannel: 'production',
    planChannel: 'production',
    fingerprintSha256: 'b'.repeat(64),
    assetCount: 1,
    approvalCount: 1,
    rolloutPercentage: 5,
  });

  assert.equal(result.allowed, false);
  assert.ok(result.blockers.some((value) => value.includes('Mudanças nativas')));
  assert.ok(result.blockers.some((value) => value.includes('runtime')));
});

test('exige administrador diferente do criador', () => {
  const selfApproval = evaluateFourEyesApproval({
    creatorUserId: 'user-1',
    approverUserId: 'user-1',
    approverRole: 'release_admin',
    status: 'awaiting_approval',
  });
  assert.equal(selfApproval.allowed, false);

  const validApproval = evaluateFourEyesApproval({
    creatorUserId: 'user-1',
    approverUserId: 'user-2',
    approverRole: 'release_admin',
    status: 'awaiting_approval',
  });
  assert.equal(validApproval.allowed, true);
});

test('retenção destrutiva exige administrador e frase explícita', () => {
  assert.deepEqual(retentionMinimumDays, {
    healthSnapshots: 180,
    operatorAudit: 365,
    incidentUpdates: 730,
  });

  const blocked = evaluateRetentionExecution({
    isReleaseAdmin: true,
    dryRun: false,
    confirmation: 'confirmar',
  });
  assert.equal(blocked.allowed, false);

  const allowed = evaluateRetentionExecution({
    isReleaseAdmin: true,
    dryRun: false,
    confirmation: 'EXCLUIR DADOS OPERACIONAIS ELEGÍVEIS',
  });
  assert.equal(allowed.allowed, true);
});
