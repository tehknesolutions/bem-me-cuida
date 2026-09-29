import assert from 'node:assert/strict';
import test from 'node:test';

import { scaleTextMetrics, textSizeMultiplier } from './accessibility-policy';

test('preferências de texto retornam multiplicadores previsíveis', () => {
  assert.equal(textSizeMultiplier('system'), 1);
  assert.equal(textSizeMultiplier('large'), 1.15);
  assert.equal(textSizeMultiplier('extra_large'), 1.3);
});

test('escala preserva relação entre fonte e entrelinha', () => {
  assert.deepEqual(scaleTextMetrics(16, 23, 1.15), { fontSize: 18, lineHeight: 26 });
  assert.deepEqual(scaleTextMetrics(24, 30, 1.3), { fontSize: 31, lineHeight: 39 });
});
