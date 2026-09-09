import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLatestObservationForContext,
  initObservationLedger,
  observationFromContextRecord,
  recordLayerObservation,
} from './contextBridge.js';
import { createMemoryObservationStorage } from './ledger.js';

test('maps a layer context record to explicit, source-linked provenance', () => {
  const record = observationFromContextRecord(
    {
      id: 'site-7',
      layerId: 'military-installations',
      label: 'Example site',
      source: 'OpenStreetMap',
      coordinates: [10, 20],
    },
    { now: () => Date.parse('2026-09-09T12:00:00Z') },
  );
  assert.equal(record.entityKey, 'military-installations:site-7');
  assert.equal(record.source.id, 'OpenStreetMap');
  assert.deepEqual(record.geometry, { type: 'Point', coordinates: [10, 20] });
  assert.equal(record.status, 'OBSERVED');
});

test('returns the persisted latest observation for a selected context', async () => {
  const storage = createMemoryObservationStorage();
  await initObservationLedger({ storage, now: () => Date.parse('2026-09-09T12:00:00Z') });
  const record = { id: 'flight-1', layerId: 'flights', source: 'OpenSky Network', label: 'TEST' };
  const bridge = await import('./contextBridge.js');
  await bridge.recordContextObservation(record);
  const latest = await getLatestObservationForContext(record);
  assert.equal(latest.source.id, 'OpenSky Network');
  assert.equal(latest.properties.label, 'TEST');
});

test('normalizes a successful layer refresh into source-health provenance', async () => {
  const storage = createMemoryObservationStorage();
  await initObservationLedger({ storage, now: () => Date.parse('2026-09-09T12:00:00Z') });
  const saved = await recordLayerObservation({
    layerId: 'earthquakes',
    module: { source: 'USGS' },
    stats: { count: 4, status: 'live', lastUpdate: '2026-09-09T11:59:00Z' },
    result: true,
    now: () => Date.parse('2026-09-09T12:00:00Z'),
  });
  assert.equal(saved.entityType, 'source-health');
  assert.equal(saved.source.id, 'USGS');
  assert.equal(saved.properties.count, 4);
});
