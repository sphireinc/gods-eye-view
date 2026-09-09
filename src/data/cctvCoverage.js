import { validateCameraCalibration, estimateGroundFootprint } from '../cctv/calibration.js';

const R = 6371;
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const rawLon = Math.abs(b.lon - a.lon);
  const dLon = Math.min(rawLon, 360 - rawLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function cameraPoint(camera) {
  const calibration = camera?.calibration || camera?.pose || camera;
  if (!calibration) return null;
  try {
    const normalized = validateCameraCalibration(calibration);
    return { lat: normalized.latitude, lon: normalized.longitude, calibration: normalized };
  } catch { return null; }
}

export function normalizeCctvCoverageCamera(camera, { now = Date.now() } = {}) {
  const point = cameraPoint(camera);
  if (!point || !camera?.id) return null;
  const frameAt = Date.parse(camera.frameObservedAt || camera.frameAt || '');
  const frameAgeMs = Number.isFinite(frameAt) ? Math.max(0, Number(now) - frameAt) : null;
  const staleAfterMs = Math.max(1, Number(camera.staleAfterMs || 5 * 60 * 1000));
  return Object.freeze({
    id: String(camera.id), name: String(camera.name || camera.id), provider: String(camera.provider || 'UNKNOWN'),
    ...point, frameObservedAt: Number.isFinite(frameAt) ? new Date(frameAt).toISOString() : null,
    frameAgeMs, frameState: frameAgeMs == null ? 'UNKNOWN' : frameAgeMs > staleAfterMs ? 'STALE' : 'FRESH',
    calibrationConfidence: point.calibration.confidence || 'UNKNOWN',
    calibrationVersion: String(camera.calibrationVersion || '1'),
    estimatedFootprint: estimateGroundFootprint(point.calibration, { groundDistanceM: camera.groundDistanceM }),
    blindSpotReasons: [
      ...(camera.terrainOccluded ? ['TERRAIN_OCCLUSION'] : []),
      ...(frameAgeMs == null ? ['NO_FRAME_TIMESTAMP'] : frameAgeMs > staleAfterMs ? ['FRAME_STALE'] : []),
      ...(point.calibration.confidence === 'UNKNOWN' ? ['POSE_UNCALIBRATED'] : []),
    ],
  });
}

export function queryCctvCoverage(cameras, { center = null, radiusKm = 10, bbox = null, now = Date.now() } = {}) {
  if (!Array.isArray(cameras)) throw new TypeError('cameras must be an array');
  const normalized = cameras.map((camera) => normalizeCctvCoverageCamera(camera, { now })).filter(Boolean);
  return normalized.filter((camera) => {
    if (center) return distanceKm({ lat: Number(center.lat), lon: Number(center.lon) }, camera) <= Number(radiusKm);
    if (!bbox) return true;
    const west = Number(bbox.west); const east = Number(bbox.east);
    const inLongitude = west <= east ? camera.lon >= west && camera.lon <= east : camera.lon >= west || camera.lon <= east;
    return inLongitude && camera.lat >= Number(bbox.south) && camera.lat <= Number(bbox.north);
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export function coverageOverlap(first, second, { radiusKm = 1 } = {}) {
  const a = normalizeCctvCoverageCamera(first);
  const b = normalizeCctvCoverageCamera(second);
  if (!a || !b) return { overlap: false, reason: 'INVALID_CALIBRATION' };
  const distance = distanceKm(a, b);
  const firstRange = Number(first.groundDistanceM || 100);
  const secondRange = Number(second.groundDistanceM || 100);
  return {
    overlap: distance <= firstRange / 1000 + secondRange / 1000 + radiusKm,
    distanceKm: distance,
    estimated: true,
    reason: 'ESTIMATED_FROM_PUBLIC_POSE_AND_FOV',
  };
}

export function createCalibrationRecord(cameraId, before, patch, { now = new Date().toISOString() } = {}) {
  const normalizedBefore = validateCameraCalibration(before);
  const after = validateCameraCalibration({ ...normalizedBefore, ...patch });
  return Object.freeze({ version: 1, cameraId: String(cameraId), before: normalizedBefore, after, changedAt: now, confidence: 'USER_CALIBRATED', caveat: 'Manual alignment is an estimate, not metric verification.' });
}

export function createCalibrationHistory() {
  const records = [];
  return {
    apply(cameraId, before, patch, options) { const record = createCalibrationRecord(cameraId, before, patch, options); records.push(record); return record.after; },
    undo() { return records.pop()?.before || null; },
    list() { return [...records]; },
  };
}
