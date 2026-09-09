import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpenCameraAtlas, validateCameraCatalogEntry } from './openCameraAtlas.js';

const camera = (overrides = {}) => ({ id: 'harbor-1', operator: 'Public Harbor Authority', region: 'Rotterdam', latitude: 51.9, longitude: 4.5, feedType: 'JPEG', privacyClass: 'scenic', sourcePage: 'https://example.test/camera', attribution: 'Public Harbor Authority', permissions: { proxy: true, thumbnail: true }, ...overrides });

test('validates catalog provenance and permission flags', () => {
  const item = validateCameraCatalogEntry(camera());
  assert.equal(item.permissions.proxy, true);
  assert.equal(item.privacyClass, 'scenic');
  assert.throws(() => validateCameraCatalogEntry(camera({ sourcePage: null })), /required/);
});

test('indexes cameras by region and honest availability', () => {
  const atlas = createOpenCameraAtlas();
  atlas.add(camera({ status: 'AVAILABLE' }));
  atlas.add(camera({ id: 'weather-2', privacyClass: 'weather', status: 'UNAVAILABLE', latitude: 52.5 }));
  assert.equal(atlas.near(51.9, 4.5, 1).length, 2);
  assert.equal(atlas.list({ availableOnly: true }).length, 1);
});
