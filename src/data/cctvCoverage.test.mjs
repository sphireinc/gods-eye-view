import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCalibrationHistory,
  coverageOverlap,
  normalizeCctvCoverageCamera,
  queryCctvCoverage,
} from './cctvCoverage.js';

const camera = (id, longitude = -73) => ({
  id, provider: 'Public feed', frameObservedAt: '2026-09-09T12:00:00Z',
  calibration: { latitude: 40, longitude, altitudeM: 10, headingDeg: 90, pitchDeg: 25, horizontalFovDeg: 70, confidence: 'SOURCE_VERIFIED' },
});

test('normalizes camera provenance, freshness, estimated footprint, and blind reasons', () => {
  const result = normalizeCctvCoverageCamera(camera('a'), { now: Date.parse('2026-09-09T12:02:00Z') });
  assert.equal(result.frameState, 'FRESH');
  assert.equal(result.calibrationConfidence, 'SOURCE_VERIFIED');
  assert.equal(result.estimatedFootprint.quality, 'SOURCE_VERIFIED');
  assert.equal(result.blindSpotReasons.length, 0);
});

test('coverage query handles antimeridian bounds and stale frame labels', () => {
  const cameras = [camera('east', 179.8), camera('west', -179.8), camera('far', 0)];
  const result = queryCctvCoverage(cameras, { bbox: { west: 179, east: -179, south: 39, north: 41 }, now: Date.parse('2026-09-09T13:00:00Z') });
  assert.deepEqual(result.map(({ id }) => id), ['east', 'west']);
  assert.equal(result[0].frameState, 'STALE');
  assert.ok(result[0].blindSpotReasons.includes('FRAME_STALE'));
});

test('overlap and calibration changes are explicitly estimates and reversible', () => {
  assert.equal(coverageOverlap(camera('a'), camera('b', -73.001)).estimated, true);
  const history = createCalibrationHistory();
  const before = camera('a').calibration;
  const after = history.apply('a', before, { headingDeg: 180 });
  assert.equal(after.headingDeg, 180);
  assert.equal(history.undo().headingDeg, 90);
});
