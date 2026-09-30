import assert from 'node:assert/strict';
import test from 'node:test';
import { isRefillDue, nextStockQuantity, stockDeltaForIntakeTransition } from './stock-policy';

test('baixa estoque apenas quando muda para tomado', () => {
  assert.equal(stockDeltaForIntakeTransition(null, 'taken', 1), -1);
  assert.equal(stockDeltaForIntakeTransition('skipped', 'taken', 2), -2);
  assert.equal(stockDeltaForIntakeTransition('taken', 'taken', 1), 0);
});

test('devolve estoque ao corrigir tomado para não tomado', () => {
  assert.equal(stockDeltaForIntakeTransition('taken', 'skipped', 1.5), 1.5);
  assert.equal(nextStockQuantity(0, 1.5), 1.5);
  assert.equal(nextStockQuantity(0.5, -2), 0);
});

test('alerta somente quando acompanhamento está ativo e limite foi atingido', () => {
  assert.equal(isRefillDue({ enabled: true, quantity: 5, threshold: 5 }), true);
  assert.equal(isRefillDue({ enabled: false, quantity: 1, threshold: 5 }), false);
  assert.equal(isRefillDue({ enabled: true, quantity: null, threshold: 5 }), false);
});
