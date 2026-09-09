import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCameraRights, filterCamerasByRights } from './cameraRights.js';

const camera = (overrides = {}) => ({ operator: 'City', sourcePage: 'https://city.test/cam', termsUrl: 'https://city.test/terms', privacyClass: 'traffic', permissions: { proxy: true, cache: true }, ...overrides });

test('allows reviewed display and gates higher-impact actions independently', () => {
  assert.equal(evaluateCameraRights(camera()).allowed, true);
  assert.equal(evaluateCameraRights(camera(), { action: 'projection' }).allowed, false);
  assert.match(evaluateCameraRights(camera(), { action: 'projection' }).reasons[0], /projection/);
});

test('rejects missing rights evidence and expired review', () => {
  const result = evaluateCameraRights(camera({ termsUrl: null, lastReviewed: '2020-01-01T00:00:00Z' }), { now: Date.parse('2026-09-09T00:00:00Z') });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.length >= 2);
  assert.equal(filterCamerasByRights([camera(), camera({ operator: null })]).length, 1);
});
