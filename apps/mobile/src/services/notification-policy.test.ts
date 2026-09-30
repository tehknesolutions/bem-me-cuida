import assert from 'node:assert/strict';
import test from 'node:test';

import { isWithinQuietHours, normalizeTimeLocal } from './notification-policy';

const overnight = { enabled: true, startLocal: '22:00', endLocal: '07:00' };

test('horário silencioso atravessa a meia-noite', () => {
  assert.equal(isWithinQuietHours('23:30', overnight), true);
  assert.equal(isWithinQuietHours('06:59', overnight), true);
  assert.equal(isWithinQuietHours('07:00', overnight), false);
  assert.equal(isWithinQuietHours('18:00', overnight), false);
});

test('horário silencioso no mesmo dia respeita início inclusivo e fim exclusivo', () => {
  const daytime = { enabled: true, startLocal: '12:00', endLocal: '14:00' };
  assert.equal(isWithinQuietHours('12:00', daytime), true);
  assert.equal(isWithinQuietHours('13:59', daytime), true);
  assert.equal(isWithinQuietHours('14:00', daytime), false);
});

test('horário desativado nunca silencia', () => {
  assert.equal(isWithinQuietHours('23:00', { ...overnight, enabled: false }), false);
});

test('normalização rejeita horários inválidos', () => {
  assert.equal(normalizeTimeLocal('09:30', '08:00'), '09:30');
  assert.equal(normalizeTimeLocal('25:90', '08:00'), '08:00');
});
