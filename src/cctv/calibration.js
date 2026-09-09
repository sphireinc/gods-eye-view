const EARTH_RADIUS_M = 6_371_000;

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite`);
  return number;
}

export function validateCameraCalibration(calibration) {
  if (!calibration || typeof calibration !== 'object') throw new TypeError('calibration is required');
  const latitude = finite(calibration.latitude, 'latitude');
  const longitude = finite(calibration.longitude, 'longitude');
  const altitudeM = finite(calibration.altitudeM, 'altitudeM');
  const headingDeg = finite(calibration.headingDeg, 'headingDeg');
  const pitchDeg = finite(calibration.pitchDeg, 'pitchDeg');
  const horizontalFovDeg = finite(calibration.horizontalFovDeg, 'horizontalFovDeg');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new RangeError('camera coordinates out of range');
  if (altitudeM <= 0 || horizontalFovDeg <= 0 || horizontalFovDeg >= 180) throw new RangeError('camera dimensions are invalid');
  return Object.freeze({ latitude, longitude, altitudeM, headingDeg: ((headingDeg % 360) + 360) % 360, pitchDeg, horizontalFovDeg, confidence: calibration.confidence || 'UNKNOWN', calibratedAt: calibration.calibratedAt || null });
}

function destination(origin, bearingDeg, distanceM) {
  const lat = origin.latitude * Math.PI / 180;
  const lon = origin.longitude * Math.PI / 180;
  const bearing = bearingDeg * Math.PI / 180;
  const angular = distanceM / EARTH_RADIUS_M;
  const nextLat = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing));
  const nextLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat), Math.cos(angular) - Math.sin(lat) * Math.sin(nextLat));
  return { latitude: nextLat * 180 / Math.PI, longitude: ((nextLon * 180 / Math.PI + 540) % 360) - 180 };
}

/** Estimate a conservative ground footprint; it is never labeled as imagery truth. */
export function estimateGroundFootprint(calibration, { groundDistanceM = null } = {}) {
  const camera = validateCameraCalibration(calibration);
  const distance = groundDistanceM == null
    ? Math.max(50, camera.altitudeM * Math.max(0.1, Math.tan(Math.abs(camera.pitchDeg) * Math.PI / 180)))
    : finite(groundDistanceM, 'groundDistanceM');
  if (distance <= 0) throw new RangeError('ground distance must be positive');
  const halfFov = camera.horizontalFovDeg / 2;
  return {
    type: 'Polygon',
    coordinates: [[
      [camera.longitude, camera.latitude],
      [destination(camera, camera.headingDeg - halfFov, distance).longitude, destination(camera, camera.headingDeg - halfFov, distance).latitude],
      [destination(camera, camera.headingDeg + halfFov, distance).longitude, destination(camera, camera.headingDeg + halfFov, distance).latitude],
      [camera.longitude, camera.latitude],
    ]],
    quality: camera.confidence,
    caveat: 'Estimated field of view from user-supplied calibration; not a measured camera footprint.',
  };
}
