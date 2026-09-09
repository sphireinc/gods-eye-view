import assert from 'node:assert/strict';
import test from 'node:test';
import { createCameraAtlas, validateCameraRecord } from './openCameraAtlas.js';
const CAMERA = { id: 'rotterdam-harbor', operator: 'Port Authority', sourcePage: 'https://example.org/camera', feedType: 'jpeg', privacyClass: 'scenic', latitude: 51.9, longitude: 4.5, available: true };
test('validates reviewed catalog records and defaults projection to estimated', () => { const result = validateCameraRecord(CAMERA); assert.equal(result.ok, true); assert.equal(result.value.projection, 'estimated'); assert.equal(validateCameraRecord({ ...CAMERA, sourcePage: 'http://bad' }).ok, false); });
test('lists across the antimeridian and clusters globally', () => { const atlas = createCameraAtlas([CAMERA, { ...CAMERA, id: 'pacific', latitude: 0, longitude: -179.5 }]); assert.equal(atlas.list({ bounds: { south: -1, north: 1, west: 170, east: -170 } }).length, 1); assert.equal(atlas.cluster({ zoom: 1 }).reduce((sum, item) => sum + item.count, 0), 2); });
