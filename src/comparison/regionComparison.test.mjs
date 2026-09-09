import assert from 'node:assert/strict';
import test from 'node:test';
import { compareRegions, rankComparableIndicator } from './regionComparison.js';

test('compares aligned indicators while preserving unknown values', () => {
  const comparison = compareRegions([
    { regionId: 'a', indicators: { events: { value: 5, sourceIds: ['s1'] } } },
    { regionId: 'b', indicators: { events: { value: null, state: 'UNKNOWN' } } },
  ], [{ id: 'events', label: 'Events' }]);
  assert.equal(comparison.rows[1].values.events.state, 'UNKNOWN');
  assert.equal(comparison.rows[1].coverage, 0);
  assert.equal(rankComparableIndicator(comparison, 'events')[0].regionId, 'a');
});

test('includes comparison caveats for granularity and causation', () => {
  const comparison = compareRegions([], []);
  assert.match(comparison.caveats.join(' '), /causation/i);
});
