import assert from 'node:assert/strict';
import test from 'node:test';
import { compareStreetFrames, normalizeStreetSequence } from './streetImagery.js';

const sequence = { id: 'seq-1', provider: 'KartaView', roadLabel: 'Main Street', sourcePage: 'https://kartaview.org', attribution: 'KartaView', frames: [{ id: 'old', capturedAt: '2020-01-01T00:00:00Z', latitude: 40, longitude: -73, url: 'https://img/old', privacyMasked: true }, { id: 'new', capturedAt: '2026-01-01T00:00:00Z', latitude: 40, longitude: -73, url: 'https://img/new' }] };

test('normalizes dated, attributed street sequences', () => {
  assert.equal(normalizeStreetSequence(sequence).frames.length, 2);
  assert.equal(normalizeStreetSequence(sequence).frames[0].privacyMasked, true);
});

test('labels sparse comparisons without pretending continuity', () => {
  const result = compareStreetFrames(sequence, { before: 'old', after: 'missing' });
  assert.equal(result.state, 'SPARSE_OR_MISSING');
  assert.match(result.caveat, /continuous observation/);
});
