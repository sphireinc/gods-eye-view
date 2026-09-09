import assert from 'node:assert/strict';
import test from 'node:test';
import { attachCameraWeather } from './cameraWeather.js';

test('attaches current weather as separate, caveated context', () => {
  const result = attachCameraWeather({ id: 'cam-1' }, { observedAt: '2026-09-09T11:59:00Z', temperatureC: 20, sourceId: 'open-meteo' }, { now: Date.parse('2026-09-09T12:00:00Z') });
  assert.equal(result.state, 'CURRENT');
  assert.equal(result.observation.sourceId, 'open-meteo');
  assert.match(result.caveat, /does not describe camera/);
});

test('labels absent and old weather honestly', () => {
  assert.equal(attachCameraWeather({ id: 'cam' }, null).state, 'UNAVAILABLE');
  assert.equal(attachCameraWeather({ id: 'cam' }, { observedAt: '2020-01-01T00:00:00Z' }, { now: Date.parse('2026-01-01T00:00:00Z') }).state, 'STALE');
});
