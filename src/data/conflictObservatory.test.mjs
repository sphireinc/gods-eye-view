import assert from 'node:assert/strict';
import test from 'node:test';
import { assessConflictRegion, normalizeConflictEvidence } from './conflictObservatory.js';

const evidence = (id, sourceId, kind = 'reported-event', minute = 0, extra = {}) => ({
  observationId: id, regionId: 'region-a', sourceId, kind, observedAt: `2026-09-09T12:${String(minute).padStart(2, '0')}:00Z`, ...extra,
});

test('normalizes coarse public evidence and aggregates point precision', () => {
  const item = normalizeConflictEvidence({ ...evidence('e1', 'ucdp'), geometry: { type: 'Point', coordinates: [12.3456, 45.6789] } });
  assert.deepEqual(item.geometry.coordinates, [12.3, 45.7]);
  assert.equal(item.entityType, 'conflict-evidence');
});

test('creates transparent indicators and uncertainty limitations', () => {
  const report = assessConflictRegion([evidence('a', 'ucdp'), evidence('b', 'reliefweb', 'humanitarian-report', 2)]);
  assert.equal(report.state, 'WATCH');
  assert.equal(report.indicators.find((item) => item.id === 'source-diversity').value, 2);
  assert.ok(report.limitations.some((text) => /public-evidence/i.test(text)));
});

test('rejects tactical fields before they can enter the observatory model', () => {
  assert.throws(() => normalizeConflictEvidence({ ...evidence('x', 'source'), target: 'sensitive' }), /disallowed/);
});

test('drops non-HTTPS source links and rejects tactical language anywhere in input', () => {
  assert.equal(normalizeConflictEvidence({ ...evidence('safe', 'source'), sourceUrl: 'http://example.org' }).sourceUrl, null);
  assert.throws(() => normalizeConflictEvidence({ ...evidence('unsafe', 'source'), caveats: ['strike support'] }), /tactical/);
});
