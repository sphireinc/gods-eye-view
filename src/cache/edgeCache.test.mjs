import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoundedEdgeCache } from './edgeCache.js';

test('coalesces cache misses and records source-aware fresh entries', async () => {
  let calls = 0;
  const cache = createBoundedEdgeCache({ enabled: true, maxBytes: 1000, now: () => 100 });
  const fetcher = async () => { calls += 1; return { source: 'public', value: 1 }; };
  const [a, b] = await Promise.all([cache.getOrFetch('key', fetcher, { sourceId: 'source-a' }), cache.getOrFetch('key', fetcher, { sourceId: 'source-a' })]);
  assert.equal(calls, 1);
  assert.equal(a.state, 'FRESH');
  assert.equal(b.value.value, 1);
});

test('disabled cache bypasses storage and labels the bypass', async () => {
  const cache = createBoundedEdgeCache({ enabled: false });
  const result = await cache.getOrFetch('key', () => ({ live: true }));
  assert.equal(result.state, 'BYPASS');
  assert.equal(cache.stats().entries, 0);
});
