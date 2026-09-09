import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addEvidence,
  correlateObservations,
  createCorrelationWorkspace,
  distanceKm,
  exportWorkspaceJson,
  exportWorkspaceMarkdown,
  explainPair,
  normalizeEvidence,
} from './eventCorrelation.js';

const record = (id, source, minute, lon = -73, lat = 40) => ({
  observationId: id,
  observedAt: `2026-09-09T12:${String(minute).padStart(2, '0')}:00Z`,
  source: { id: source },
  geometry: { type: 'Point', coordinates: [lon, lat] },
});

test('groups overlapping public observations and preserves source diversity', () => {
  const [event] = correlateObservations([
    record('a', 'usgs', 0),
    record('b', 'nasa-firms', 10, -73.05, 40.02),
  ], { radiusKm: 10, windowMs: 20 * 60 * 1000 });
  assert.equal(event.observationCount, 2);
  assert.equal(event.sourceCount, 2);
  assert.equal(event.agreement, 'MULTI-SOURCE');
  assert.match(event.caveat, /not proof of causation/i);
});

test('does not merge distant or temporally separated observations', () => {
  const events = correlateObservations([
    record('a', 'one', 0),
    record('b', 'two', 5, -74, 40),
    record('c', 'three', 59),
  ], { radiusKm: 10, windowMs: 10 * 60 * 1000 });
  assert.equal(events.length, 3);
});

test('skips records without trustworthy observation time', () => {
  assert.deepEqual(correlateObservations([{ observationId: 'no-time' }]), []);
});

test('handles the antimeridian and retains pairwise mathematical explanations', () => {
  assert.ok(distanceKm({ lon: 179.9, lat: 10 }, { lon: -179.9, lat: 10 }) < 25);
  const left = record('left', 'adsb', 0, 179.9, 10);
  const right = { ...record('right', 'usgs', 5, -179.9, 10), heading: 90, routeId: 'public-route-1' };
  left.heading = 100;
  left.routeId = 'public-route-1';
  const explanation = explainPair(left, right, { radiusKm: 25, windowMs: 10 * 60 * 1000 });
  assert.equal(explanation.match, true);
  assert.ok(explanation.explanations.some((item) => /within 25 km/.test(item)));
  assert.ok(explanation.explanations.some((item) => /public-route-1/.test(item)));
  assert.ok(explanation.explanations.some((item) => /heading differs/.test(item)));
});

test('privacy gate excludes person-shaped records before correlation', () => {
  assert.equal(normalizeEvidence({
    observationId: 'person-1', entityType: 'person', observedAt: '2026-09-09T12:00:00Z',
  }), null);
  assert.equal(correlateObservations([
    record('public-1', 'source-a', 0),
    { ...record('person-1', 'source-b', 1), entityType: 'individual' },
  ]).length, 1);
});

test('workspace evidence is deduplicated and exports source-linked limitations', () => {
  const workspace = createCorrelationWorkspace({ title: 'Road closure question' });
  const withEvidence = addEvidence(workspace, [record('a', 'source-a', 0), record('a', 'source-a', 0)]);
  assert.equal(withEvidence.evidence.length, 1);
  const json = exportWorkspaceJson(withEvidence);
  const markdown = exportWorkspaceMarkdown(withEvidence);
  assert.match(json, /"limitations"/);
  assert.match(markdown, /## Evidence/);
  assert.match(markdown, /## Limitations/);
  assert.match(markdown, /source-a/);
});
