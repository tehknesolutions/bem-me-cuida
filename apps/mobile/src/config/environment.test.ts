import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePublicEnvironment } from './environment';

test('aceita URL HTTPS e publishable key', () => {
  const result = parsePublicEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  });
  assert.equal(result.configured, true);
});

test('rejeita chave administrativa no aplicativo', () => {
  const result = parsePublicEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ['sb', 'secret', 'never_ship_this_key'].join('_'),
  });
  assert.equal(result.problem, 'administrative_key');
  assert.equal(result.supabasePublishableKey, null);
});

test('permite HTTP somente no ambiente local', () => {
  assert.equal(parsePublicEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-anon-key',
  }).configured, true);
  assert.equal(parsePublicEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: 'http://example.com',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  }).problem, 'invalid_url');
});
