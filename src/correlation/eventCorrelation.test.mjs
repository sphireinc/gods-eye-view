import assert from 'node:assert/strict';
import test from 'node:test';
import { correlateObservations } from './eventCorrelation.js';

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
