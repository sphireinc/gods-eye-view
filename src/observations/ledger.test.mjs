import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OBSERVATION_SCHEMA_VERSION,
  createMemoryObservationStorage,
  createObservationLedger,
  normalizeObservation,
} from './ledger.js';

const source = {
  id: 'opensky',
  version: 'states-v1',
  url: 'https://opensky-network.org',
  license: 'provider-terms',
  attribution: 'OpenSky Network',
};

function observation(overrides = {}) {
  return {
    observationId: 'obs-1',
    entityKey: 'flight:abc123',
    entityType: 'aircraft',
    source,
    observedAt: '2026-09-09T12:00:00.000Z',
    receivedAt: '2026-09-09T12:00:01.000Z',
    geometry: { type: 'Point', coordinates: [-73, 40] },
    properties: { callsign: 'TEST' },
    derivation: ['OpenSky normalized state vector'],
    status: 'OBSERVED',
    ...overrides,
  };
}

test('normalizes required provenance fields and freezes the record', () => {
  const record = normalizeObservation(observation());
  assert.equal(record.schemaVersion, OBSERVATION_SCHEMA_VERSION);
  assert.equal(record.source.id, 'opensky');
  assert.equal(record.observedAt, '2026-09-09T12:00:00.000Z');
  assert.equal(Object.isFrozen(record), true);
  assert.throws(() => normalizeObservation(observation({ status: 'GUESS' })), /unsupported observation status/);
  assert.throws(() => normalizeObservation(observation({ source: null })), /source is required/);
});

test('deduplicates by observation id and queries newest observations first', async () => {
  const ledger = createObservationLedger({ storage: createMemoryObservationStorage(), now: () => Date.parse('2026-09-09T13:00:00Z') });
  await ledger.append(observation({ properties: { version: 1 } }));
  await ledger.append(observation({ properties: { version: 2 } }));
  await ledger.append(observation({
    observationId: 'obs-2',
    observedAt: '2026-09-09T12:30:00.000Z',
    entityKey: 'flight:def456',
  }));
  const rows = await ledger.query({ entityKey: 'flight:abc123' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].properties.version, 2);
  assert.equal((await ledger.query()).length, 2);
});

test('prunes expired observations without confusing missing data with absence', async () => {
  const now = Date.parse('2026-09-09T13:00:00Z');
  const ledger = createObservationLedger({
    storage: createMemoryObservationStorage(),
    now: () => now,
    retentionMs: 60 * 60 * 1000,
  });
  await ledger.append(observation({ receivedAt: '2026-09-09T10:00:00Z' }));
  await ledger.append(observation({ observationId: 'obs-2', receivedAt: '2026-09-09T12:30:00Z' }));
  assert.equal((await ledger.query()).length, 1);
  assert.equal((await ledger.query())[0].observationId, 'obs-2');
});

test('exports a portable source-linked snapshot', async () => {
  const ledger = createObservationLedger({ storage: createMemoryObservationStorage(), now: () => Date.parse('2026-09-09T13:00:00Z') });
  await ledger.append(observation());
  const archive = await ledger.export({ entityKey: 'flight:abc123' });
  assert.equal(archive.schemaVersion, OBSERVATION_SCHEMA_VERSION);
  assert.equal(archive.records[0].source.attribution, 'OpenSky Network');
  assert.equal(archive.exportedAt, '2026-09-09T13:00:00.000Z');
});

test('reports exact remaining count when the byte budget evicts oldest records', async () => {
  const storage = createMemoryObservationStorage();
  const ledger = createObservationLedger({
    storage,
    maxBytes: 1,
    now: () => Date.parse('2026-09-09T13:00:00Z'),
  });
  const result = await ledger.append(observation());
  assert.equal(result.observationId, 'obs-1');
  assert.equal((await ledger.query()).length, 0);
});
