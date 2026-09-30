import assert from 'node:assert/strict';
import test from 'node:test';

import { nextRetryAt, retryDelayMinutes, safeSyncErrorCode } from './sync-policy';

test('backoff cresce e respeita teto de 60 minutos', () => {
  assert.equal(retryDelayMinutes(1), 2);
  assert.equal(retryDelayMinutes(4), 16);
  assert.equal(retryDelayMinutes(10), 60);
});

test('próxima tentativa é determinística', () => {
  assert.equal(nextRetryAt(2, Date.parse('2026-07-24T12:00:00.000Z')), '2026-07-24T12:04:00.000Z');
});

test('erro de sincronização remove e-mail e URL', () => {
  const code = safeSyncErrorCode(new Error('request for ana@example.com failed at https://example.com/private'));
  assert.equal(code.includes('ana@example.com'), false);
  assert.equal(code.includes('https://'), false);
});
