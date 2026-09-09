import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exportOfflineSnapshot,
  importOfflineSnapshot,
  observationsCsv,
  observationsGeoJson,
} from './snapshot.js';

test('exports and imports a portable verified snapshot', async () => {
  const snapshot = await exportOfflineSnapshot({ observations: [{ observationId: 'a' }], layers: ['earthquakes'], view: { lon: 1, lat: 2 } });
  const imported = await importOfflineSnapshot(snapshot);
  assert.deepEqual(imported.observations, [{ observationId: 'a' }]);
  assert.equal(imported.layers[0], 'earthquakes');
});

test('rejects tampered payloads and oversized snapshots', async () => {
  const snapshot = await exportOfflineSnapshot({ observations: [] });
  snapshot.payload.view = { changed: true };
  await assert.rejects(() => importOfflineSnapshot(snapshot), /integrity/);
  const fresh = await exportOfflineSnapshot({ observations: [] });
  await assert.rejects(() => importOfflineSnapshot(fresh, { maxBytes: 1 }), /size limit/);
});

test('diagnostic exports redact credentials and notes while presentation keeps notes', async () => {
  const diagnostic = await exportOfflineSnapshot({
    mode: 'DIAGNOSTIC',
    observations: [{ observationId: 'a', observedAt: '2026-09-09T12:00:00Z', apiKey: 'secret' }],
    notes: 'private note',
  });
  assert.equal(JSON.stringify(diagnostic).includes('secret'), false);
  assert.equal(JSON.stringify(diagnostic).includes('private note'), false);
  const presentation = await exportOfflineSnapshot({ mode: 'PRESENTATION', notes: 'teaching note' });
  assert.equal(presentation.payload.notes, 'teaching note');
});

test('refuses unlicensed thumbnails and malformed coordinates', async () => {
  await assert.rejects(() => exportOfflineSnapshot({ thumbnails: [{ url: 'x' }], includeThumbnails: true }), /license/);
  await assert.rejects(() => exportOfflineSnapshot({ observations: [{ geometry: { coordinates: [181, 2] } }] }), /bounds/);
});

test('selected public observations export to redacted GeoJSON and CSV', () => {
  const observations = [{ observationId: 'a', sourceId: 'usgs', observedAt: '2026-09-09T12:00:00Z', apiToken: 'x', geometry: { type: 'Point', coordinates: [1, 2] } }];
  assert.equal(observationsGeoJson(observations).features[0].geometry.coordinates[0], 1);
  assert.equal(JSON.stringify(observationsGeoJson(observations)).includes('apiToken'), false);
  assert.match(observationsCsv(observations), /observationId/);
  assert.match(observationsCsv(observations), /usgs/);
});
