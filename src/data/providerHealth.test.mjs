import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyProviderFailure, createProviderHealthStore, sanitizeProviderDiagnostics } from './providerHealth.js';

test('classifies common provider failure categories', () => {
  assert.equal(classifyProviderFailure({ status: 429 }), 'RATE_LIMITED');
  assert.equal(classifyProviderFailure({ status: 503 }), 'UPSTREAM');
  assert.equal(classifyProviderFailure({ name: 'AbortError' }), 'TIMEOUT');
});

test('redacts credential-shaped diagnostic keys recursively', () => {
  assert.deepEqual(sanitizeProviderDiagnostics({ apiKey: 'secret', nested: { token: 'hidden', status: 'ok' } }), { apiKey: '[REDACTED]', nested: { token: '[REDACTED]', status: 'ok' } });
});

test('tracks sanitized provider attempts and stale state', () => {
  let clock = 1_000;
  const store = createProviderHealthStore({ now: () => clock, staleAfterMs: 100 });
  store.update('opensky', { success: true, lastSuccess: 900, apiKey: 'never-store' });
  clock = 1_100;
  const row = store.update('opensky', { success: false })[0];
  assert.equal(row.attempts, 2);
  assert.equal(row.state, 'STALE');
  assert.equal(row.apiKey, '[REDACTED]');
  assert.equal(store.diagnostics().providers.length, 1);
});
