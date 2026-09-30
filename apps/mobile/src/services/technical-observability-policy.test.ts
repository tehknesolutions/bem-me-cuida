import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeTechnicalContext } from './technical-observability-policy';

test('mantém somente números finitos, booleanos e nulos', () => {
  assert.deepEqual(sanitizeTechnicalContext({
    ok: true,
    count: 3,
    empty: null,
    text: 'conteúdo proibido',
    nested: { value: 1 },
    infinite: Number.POSITIVE_INFINITY,
  }), { ok: true, count: 3, empty: null });
});

test('descarta chaves inválidas e limita o contexto', () => {
  const input: Record<string, unknown> = { 'invalid-key': 1, '2startsWrong': 2 };
  for (let index = 0; index < 30; index += 1) input[`metric_${index}`] = index;
  const output = sanitizeTechnicalContext(input);
  assert.equal(Object.keys(output).length, 18);
  assert.equal('invalid-key' in output, false);
  assert.equal('2startsWrong' in output, false);
});
