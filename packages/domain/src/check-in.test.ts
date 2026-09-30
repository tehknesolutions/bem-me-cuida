import assert from 'node:assert/strict';
import test from 'node:test';

import { createCheckInInputSchema } from './check-in';

const valid = {
  mood: 'neutral', anxiety: 4, energy: 5, irritability: 2, agitation: 2, impulsivity: 1,
  concentration: 6, craving: 0, sleepQuality: 'partial', sleepMinutes: 420, note: 'Registro curto.',
} as const;

test('check-in aceita um registro válido', () => { assert.equal(createCheckInInputSchema.safeParse(valid).success, true); });
test('check-in rejeita escala fora de 0 a 10', () => { assert.equal(createCheckInInputSchema.safeParse({ ...valid, anxiety: 11 }).success, false); });
test('check-in rejeita texto excessivo', () => { assert.equal(createCheckInInputSchema.safeParse({ ...valid, note: 'a'.repeat(501) }).success, false); });
