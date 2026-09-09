import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveCameraCondition } from './cameraConditions.js';
test('combines public evidence and labels conflicting conditions mixed', () => { const result = deriveCameraCondition({ cameraTag: 'CLEAR', weather: { sourceId: 'station', visibilityM: 500, observedAt: '2026-09-09T12:00:00Z' }, frameAt: '2026-09-09T12:00:00Z', now: Date.parse('2026-09-09T12:01:00Z') }); assert.equal(result.condition, 'MIXED'); assert.equal(result.state, 'CURRENT'); assert.match(result.caveat, /not operational/); });
test('keeps stale conditions as last observed and never current', () => { const result = deriveCameraCondition({ weather: { precipitation: 1, temperatureC: 0, observedAt: '2020-01-01T00:00:00Z' }, now: Date.parse('2026-01-01T00:00:00Z') }); assert.equal(result.condition, 'SNOWY'); assert.equal(result.state, 'LAST_OBSERVED'); });
