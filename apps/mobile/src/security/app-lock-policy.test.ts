import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldRequireAppUnlock } from './app-lock-policy';

test('não bloqueia quando biometria está desativada', () => {
  assert.equal(shouldRequireAppUnlock({ biometricEnabled: false, backgroundAt: 1_000, now: 90_000, lockAfterSeconds: 30 }), false);
});

test('bloqueia imediatamente quando intervalo é zero', () => {
  assert.equal(shouldRequireAppUnlock({ biometricEnabled: true, backgroundAt: 1_000, now: 1_001, lockAfterSeconds: 0 }), true);
});

test('respeita o intervalo configurado', () => {
  assert.equal(shouldRequireAppUnlock({ biometricEnabled: true, backgroundAt: 1_000, now: 30_999, lockAfterSeconds: 30 }), false);
  assert.equal(shouldRequireAppUnlock({ biometricEnabled: true, backgroundAt: 1_000, now: 31_000, lockAfterSeconds: 30 }), true);
});
