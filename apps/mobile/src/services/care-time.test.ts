import assert from 'node:assert/strict';
import test from 'node:test';

import { EVERY_DAY_MASK, dateAtLocalTime, formatLocalDate, maskIncludesDate, toggleWeekday } from './care-time';

test('máscara diária inclui todos os dias da semana', () => {
  for (let day = 0; day < 7; day += 1) {
    const date = new Date(2026, 6, 19 + day, 12, 0, 0);
    assert.equal(maskIncludesDate(EVERY_DAY_MASK, date), true);
  }
});

test('toggle não permite remover o último dia', () => {
  assert.equal(toggleWeekday(1, 1), 1);
  assert.equal(toggleWeekday(3, 1), 2);
});

test('monta horário no fuso local', () => {
  const result = dateAtLocalTime(new Date(2026, 6, 24, 13, 20), '08:45');
  assert.equal(result.getHours(), 8);
  assert.equal(result.getMinutes(), 45);
  assert.equal(formatLocalDate(result), '2026-07-24');
});
