export const CAMERA_CATALOG_VERSION = 1;
const FEED_TYPES = new Set(['jpeg', 'mjpeg', 'hls', 'dash', 'embedded', 'metadata']);
const PRIVACY_CLASSES = new Set(['scenic', 'traffic', 'weather', 'wildlife', 'transit', 'mixed']);
export function validateCameraRecord(record) {
  const camera = { ...record, id: String(record?.id || '').trim(), operator: String(record?.operator || '').trim(), sourcePage: String(record?.sourcePage || '').trim(), feedType: String(record?.feedType || '').toLowerCase(), privacyClass: String(record?.privacyClass || '').toLowerCase(), latitude: Number(record?.latitude), longitude: Number(record?.longitude) };
  const errors = [];
  if (!camera.id || !/^[a-z0-9][a-z0-9._-]{1,96}$/i.test(camera.id)) errors.push('id');
  if (!camera.operator) errors.push('operator');
  if (!/^https:\/\//i.test(camera.sourcePage)) errors.push('sourcePage');
  if (!FEED_TYPES.has(camera.feedType)) errors.push('feedType');
  if (!PRIVACY_CLASSES.has(camera.privacyClass)) errors.push('privacyClass');
  if (!Number.isFinite(camera.latitude) || camera.latitude < -90 || camera.latitude > 90) errors.push('latitude');
  if (!Number.isFinite(camera.longitude) || camera.longitude < -180 || camera.longitude > 180) errors.push('longitude');
  return errors.length ? { ok: false, errors } : { ok: true, value: { ...camera, catalogVersion: CAMERA_CATALOG_VERSION, projection: camera.projection === 'calibrated' ? 'calibrated' : 'estimated' } };
}
export function createCameraAtlas(records = []) {
  const cameras = records.map(validateCameraRecord).filter((result) => result.ok).map((result) => result.value);
  return {
    list({ bounds, type, available } = {}) { return cameras.filter((camera) => (!type || camera.privacyClass === type) && (available === undefined || camera.available === available) && (!bounds || (camera.latitude >= bounds.south && camera.latitude <= bounds.north && (bounds.west <= bounds.east ? camera.longitude >= bounds.west && camera.longitude <= bounds.east : camera.longitude >= bounds.west || camera.longitude <= bounds.east)))); },
    cluster({ zoom = 2, bounds } = {}) { const cell = Math.max(0.05, 18 / (2 ** Math.max(0, Math.min(8, Number(zoom) || 0)))); const groups = new Map(); for (const camera of this.list({ bounds })) { const key = `${Math.floor((camera.latitude + 90) / cell)}:${Math.floor((camera.longitude + 180) / cell)}`; const group = groups.get(key) || { latitude: 0, longitude: 0, count: 0, available: 0 }; group.latitude += camera.latitude; group.longitude += camera.longitude; group.count += 1; group.available += camera.available === true ? 1 : 0; groups.set(key, group); } return [...groups.values()].map((group) => ({ ...group, latitude: group.latitude / group.count, longitude: group.longitude / group.count })); },
    get(id) { return cameras.find((camera) => camera.id === id) || null; }, size() { return cameras.length; },
  };
}
