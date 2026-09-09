const FEED_TYPES = new Set(['JPEG', 'MJPEG', 'HLS', 'DASH', 'EMBED', 'METADATA']);
const PRIVACY_CLASSES = new Set(['scenic', 'traffic', 'weather', 'wildlife', 'transit', 'mixed-public-space']);

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be finite`);
  return number;
}

export function validateCameraCatalogEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new TypeError('camera entry is required');
  const latitude = finite(entry.latitude, 'latitude');
  const longitude = finite(entry.longitude, 'longitude');
  const feedType = String(entry.feedType || 'METADATA').toUpperCase();
  const privacyClass = String(entry.privacyClass || '').toLowerCase();
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new RangeError('camera coordinates out of range');
  if (!FEED_TYPES.has(feedType)) throw new TypeError(`unsupported camera feed type: ${feedType}`);
  if (!PRIVACY_CLASSES.has(privacyClass)) throw new TypeError(`unsupported camera privacy class: ${privacyClass}`);
  if (!entry.sourcePage || !entry.operator || !entry.attribution) throw new TypeError('camera operator, sourcePage, and attribution are required');
  return Object.freeze({
    id: String(entry.id), operator: String(entry.operator), region: String(entry.region || 'Unknown'),
    latitude, longitude, elevationM: entry.elevationM == null ? null : finite(entry.elevationM, 'elevationM'),
    headingDeg: entry.headingDeg == null ? null : finite(entry.headingDeg, 'headingDeg'),
    fovDeg: entry.fovDeg == null ? null : finite(entry.fovDeg, 'fovDeg'), feedType, privacyClass,
    sourcePage: String(entry.sourcePage), termsUrl: entry.termsUrl ? String(entry.termsUrl) : null,
    attribution: String(entry.attribution), cadenceSec: entry.cadenceSec == null ? null : finite(entry.cadenceSec, 'cadenceSec'),
    lastReviewed: entry.lastReviewed ? String(entry.lastReviewed) : null,
    permissions: Object.freeze({ proxy: entry.permissions?.proxy === true, cache: entry.permissions?.cache === true, thumbnail: entry.permissions?.thumbnail !== false, projection: entry.permissions?.projection === true, export: entry.permissions?.export === true }),
    status: entry.status || 'UNKNOWN',
  });
}

export function createOpenCameraAtlas(entries = []) {
  const cameras = new Map();
  return {
    add(entry) { const camera = validateCameraCatalogEntry(entry); cameras.set(camera.id, camera); return camera; },
    remove(id) { return cameras.delete(id); },
    get(id) { return cameras.get(id) || null; },
    list({ privacyClass, feedType, availableOnly = false } = {}) {
      return [...cameras.values()].filter((camera) => (!privacyClass || camera.privacyClass === privacyClass) && (!feedType || camera.feedType === feedType) && (!availableOnly || camera.status === 'AVAILABLE'));
    },
    near(latitude, longitude, radiusDeg = 5) {
      return [...cameras.values()].filter((camera) => Math.abs(camera.latitude - latitude) <= radiusDeg && Math.abs(camera.longitude - longitude) <= radiusDeg);
    },
  };
}
