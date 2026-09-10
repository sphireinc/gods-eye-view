import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyProviderFailure, createPauseController, createProviderHealthStore, estimateProviderCost, providerConfiguration, sanitizeProviderDiagnostics } from './providerHealth.js';

test('classifies common provider failure categories', () => {
  assert.equal(classifyProviderFailure({ status: 429 }), 'RATE_LIMITED');
  assert.equal(classifyProviderFailure({ status: 503 }), 'UPSTREAM');
  assert.equal(classifyProviderFailure({ name: 'AbortError' }), 'TIMEOUT');
});

test('configuration reports presence without leaking values and cost is bounded to known providers', () => {
  const rows = providerConfiguration([{ id: 'x', label: 'X', group: 'test', env: ['X_KEY'], unitCost: 0.01 }], { X_KEY: 'secret' });
  assert.deepEqual(rows[0], { id: 'x', label: 'X', group: 'test', configured: true, metered: true, pricingVersion: '2026-09-09' });
  assert.equal(estimateProviderCost([{ id: 'x', attempts: 3 }], [{ id: 'x', unitCost: 0.01 }]), 0.03);
});

test('pause controller only accepts catalog ids and is reversible', () => {
  const controller = createPauseController(['opensky']);
  assert.equal(controller.toggle('unknown'), false);
  assert.equal(controller.toggle('opensky'), true);
  assert.deepEqual(controller.snapshot(), ['opensky']);
  assert.equal(controller.toggle('opensky', false), false);
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
