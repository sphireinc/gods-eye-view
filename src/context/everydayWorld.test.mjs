import assert from 'node:assert/strict';
import test from 'node:test';
import { clusterContinuityItems, createContinuityPreset, validateEverydayContext } from './everydayWorld.js';

test('builds a non-sensitive civic continuity preset', () => {
  const preset = createContinuityPreset([{ id: 'park-1', category: 'park', label: 'Central Park', latitude: 40, longitude: -73, sourceId: 'osm' }, { id: 'private-1', category: 'sports', sensitive: true }]);
  assert.equal(preset.items.length, 1);
  assert.match(preset.caveat, /individual movement/);
});

test('deduplicates civic entities and clusters them without attendance data', () => {
  const preset = createContinuityPreset([{ id: 'p', category: 'park', latitude: 1, longitude: 2 }, { id: 'p', category: 'park', latitude: 1, longitude: 2 }, { id: 'l', category: 'library', latitude: 1.2, longitude: 2.1 }]);
  assert.equal(preset.items.length, 2); assert.equal(clusterContinuityItems(preset.items, { cellDegrees: 1 })[0].count, 2);
});

test('rejects unknown categories', () => {
  assert.throws(() => validateEverydayContext({ id: 'x', category: 'person' }), /invalid/);
});
