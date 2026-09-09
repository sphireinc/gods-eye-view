import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateCoverageCell, coverageDimension, createCoverageAtlas } from './coverageAtlas.js';

test('exposes inspectable coverage components and avoids safety interpretation', () => {
  const cell = aggregateCoverageCell('h3-1', { sourceCount: 0 });
  assert.equal(cell.level, 'MISSING');
  assert.match(cell.interpretation, /NOT MEAN/);
  assert.equal(cell.components.cameraAvailability, 'UNKNOWN');
});

test('exposes separate freshness, diversity, and precision dimensions', () => {
  const cell = aggregateCoverageCell('x', { sourceCount: 2, freshestAgeMs: 2 * 60 * 60 * 1000, precisionM: 5000, sourceFamilies: ['weather', 'camera', 'weather'] });
  assert.equal(coverageDimension(cell, 'freshness'), 'AGING'); assert.equal(coverageDimension(cell, 'diversity'), 'MULTI_SOURCE'); assert.equal(cell.components.sourceFamilies.length, 2); assert.ok(cell.recommendations.length >= 0);
});

test('classifies strong and stale coverage from visible components', () => {
  const atlas = createCoverageAtlas();
  atlas.upsert('strong', { sourceCount: 4, freshestAgeMs: 1_000, precisionM: 100, provenancePct: 1 });
  atlas.upsert('weak', { sourceCount: 1, freshestAgeMs: 3 * 24 * 60 * 60 * 1000, precisionM: 10000, provenancePct: .2 });
  assert.equal(atlas.list({ level: 'STRONG' }).length, 1);
  assert.equal(atlas.get('weak').level, 'WEAK');
});
