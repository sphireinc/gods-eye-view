import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateGroundFootprint, validateCameraCalibration } from './calibration.js';

const calibration = { latitude: 40, longitude: -73, altitudeM: 30, headingDeg: 90, pitchDeg: 25, horizontalFovDeg: 70, confidence: 'USER_CALIBRATED' };

test('normalizes camera pose and wraps heading', () => {
  assert.equal(validateCameraCalibration({ ...calibration, headingDeg: -90 }).headingDeg, 270);
  assert.throws(() => validateCameraCalibration({ ...calibration, horizontalFovDeg: 180 }), /invalid/);
});

test('estimates a conservative, explicitly caveated ground footprint', () => {
  const footprint = estimateGroundFootprint(calibration, { groundDistanceM: 100 });
  assert.equal(footprint.type, 'Polygon');
  assert.equal(footprint.coordinates[0].length, 4);
  assert.match(footprint.caveat, /Estimated/);
});
