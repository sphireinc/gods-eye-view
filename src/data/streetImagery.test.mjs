import assert from 'node:assert/strict';
import test from 'node:test';
import { compareStreetFrames, normalizeStreetSequence, streetFrameForDate } from './streetImagery.js';

const sequence = { id: 'seq-1', provider: 'KartaView', roadLabel: 'Main Street', sourcePage: 'https://kartaview.org', attribution: 'KartaView', frames: [{ id: 'old', capturedAt: '2020-01-01T00:00:00Z', latitude: 40, longitude: -73, url: 'https://img/old', privacyMasked: true }, { id: 'new', capturedAt: '2026-01-01T00:00:00Z', latitude: 40, longitude: -73, url: 'https://img/new' }] };

test('normalizes dated, attributed street sequences', () => {
  assert.equal(normalizeStreetSequence(sequence).frames.length, 2);
  assert.equal(normalizeStreetSequence(sequence).frames[0].privacyMasked, true);
});

test('rejects non-HTTPS frames and selects the nearest dated capture', () => {
  assert.equal(normalizeStreetSequence({ ...sequence, frames: [{ ...sequence.frames[0], url: 'http://bad' }] }).frames.length, 0);
  assert.equal(streetFrameForDate(sequence, '2020-01-02T00:00:00Z').id, 'old');
});

test('labels sparse comparisons without pretending continuity', () => {
  const result = compareStreetFrames(sequence, { before: 'old', after: 'missing' });
  assert.equal(result.state, 'SPARSE_OR_MISSING');
  assert.match(result.caveat, /continuous observation/);
});
