import assert from 'node:assert/strict';
import test from 'node:test';
import { exportOfflineSnapshot, importOfflineSnapshot } from './snapshot.js';

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
