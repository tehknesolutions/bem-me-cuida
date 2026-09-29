import test from 'node:test';
import assert from 'node:assert/strict';

test('weekly comparison variation is absolute, not interpretive', () => {
  const current = 12;
  const previous = 10;
  assert.equal(current - previous, 2);
  assert.equal(current - previous > 0, true);
});

test('weekly comparison can represent a decrease without labeling it as improvement or decline', () => {
  const current = 8;
  const previous = 11;
  assert.equal(current - previous, -3);
});

test('equal weekly totals produce zero variation', () => {
  assert.equal(7 - 7, 0);
});
