import assert from 'node:assert/strict';
import test from 'node:test';
import { createContinuityPreset, validateEverydayContext } from './everydayWorld.js';

test('builds a non-sensitive civic continuity preset', () => {
  const preset = createContinuityPreset([{ id: 'park-1', category: 'park', label: 'Central Park', latitude: 40, longitude: -73, sourceId: 'osm' }, { id: 'private-1', category: 'sports', sensitive: true }]);
  assert.equal(preset.items.length, 1);
  assert.match(preset.caveat, /individual movement/);
});

test('rejects unknown categories', () => {
  assert.throws(() => validateEverydayContext({ id: 'x', category: 'person' }), /invalid/);
});
