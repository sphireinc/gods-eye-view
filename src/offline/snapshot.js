export const SNAPSHOT_SCHEMA_VERSION = 1;
export const SNAPSHOT_FORMAT = 'gods-eye-view/offline-snapshot';
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_OBSERVATIONS = 100_000;
const SENSITIVE_KEYS = /(?:token|secret|password|api.?key|authorization|cookie|private.?url|\.env)/i;

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

async function digest(text) {
  if (!globalThis.crypto?.subtle) return `length:${text.length}`;
  const bytes = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function redact(value, { redactNotes = true } = {}) {
  if (Array.isArray(value)) return value.map((item) => redact(item, { redactNotes }));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !SENSITIVE_KEYS.test(key) && !(redactNotes && /notes?|comment/i.test(key)))
    .map(([key, nested]) => [key, redact(nested, { redactNotes })]));
}

function validateCoordinate(value) {
  if (!Array.isArray(value) || value.length < 2) return false;
  const lon = Number(value[0]);
  const lat = Number(value[1]);
  return Number.isFinite(lon) && lon >= -180 && lon <= 180 && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function validateObservations(observations, maxObservations) {
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');
  if (observations.length > maxObservations) throw new RangeError('observation count exceeds limit');
  for (const observation of observations) {
    const coordinates = observation?.geometry?.coordinates;
    if (coordinates && !validateCoordinate(coordinates)) throw new RangeError('observation coordinate is out of bounds');
  }
}

export async function exportOfflineSnapshot({
  mode = 'PRESENTATION', observations = [], view = null, layers = [], sources = [],
  annotations = [], captureRange = null, appRevision = 'unknown', thumbnails = [],
  includeThumbnails = false, thumbnailsLicensed = false, notes = '', maxObservations = DEFAULT_MAX_OBSERVATIONS,
} = {}) {
  if (!['DIAGNOSTIC', 'PRESENTATION'].includes(mode)) throw new TypeError('unsupported snapshot mode');
  validateObservations(observations, maxObservations);
  if (includeThumbnails && !thumbnailsLicensed) throw new Error('thumbnail license confirmation is required');
  const safeThumbnails = includeThumbnails ? thumbnails : [];
  const payload = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    offline: true,
    network: 'DISABLED_ON_IMPORT',
    mode,
    appRevision: String(appRevision),
    exportedAt: new Date().toISOString(),
    captureRange,
    observations: redact(observations, { redactNotes: mode === 'DIAGNOSTIC' }),
    view: redact(view, { redactNotes: true }),
    layers: layers.map(String),
    sources: redact(sources, { redactNotes: true }),
    annotations: redact(annotations, { redactNotes: mode === 'DIAGNOSTIC' }),
    thumbnails: safeThumbnails,
    limitations: [
      'This archive contains a bounded public-data snapshot, not a live feed.',
      'Provider terms and source freshness remain attached to the source manifest.',
    ],
    ...(mode === 'PRESENTATION' ? { notes: String(notes) } : {}),
  };
  const canonicalPayload = canonical(payload);
  return {
    format: SNAPSHOT_FORMAT,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    manifest: {
      files: ['scene.json', 'observations.ndjson', 'sources.json', 'annotations.json'],
      observationCount: observations.length,
      thumbnailCount: safeThumbnails.length,
      mode,
    },
    integrity: { algorithm: 'SHA-256', digest: await digest(canonicalPayload) },
    payload,
  };
}

export async function importOfflineSnapshot(snapshot, {
  maxBytes = DEFAULT_MAX_BYTES, maxObservations = DEFAULT_MAX_OBSERVATIONS,
} = {}) {
  if (!snapshot || snapshot.format !== SNAPSHOT_FORMAT) throw new TypeError('unsupported snapshot format');
  if (snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || snapshot.payload?.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) throw new Error('unsupported snapshot schema');
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > maxBytes) throw new RangeError('snapshot exceeds size limit');
  const expected = await digest(canonical(snapshot.payload));
  if (expected !== snapshot.integrity?.digest) throw new Error('snapshot integrity check failed');
  validateObservations(snapshot.payload.observations, maxObservations);
  if (snapshot.payload.offline !== true || snapshot.payload.network !== 'DISABLED_ON_IMPORT') throw new Error('snapshot is not offline-safe');
  if (!Array.isArray(snapshot.payload.layers) || !Array.isArray(snapshot.payload.sources)) throw new TypeError('snapshot payload is malformed');
  return structuredClone({ ...snapshot.payload, importMode: 'OFFLINE', network: 'DISABLED_ON_IMPORT' });
}

export function observationsGeoJson(observations = []) {
  validateObservations(observations, DEFAULT_MAX_OBSERVATIONS);
  return { type: 'FeatureCollection', features: observations.filter((item) => validateCoordinate(item?.geometry?.coordinates)).map((item) => ({
    type: 'Feature', geometry: item.geometry, properties: redact({ ...item, geometry: undefined }, { redactNotes: true }),
  })) };
}

export function observationsCsv(observations = []) {
  const rows = [['observationId', 'source', 'observedAt', 'longitude', 'latitude']];
  for (const item of observations) {
    const coordinates = item?.geometry?.coordinates || [];
    rows.push([item.observationId || item.id || '', item.source?.id || item.sourceId || '', item.observedAt || '', coordinates[0] ?? '', coordinates[1] ?? '']);
  }
  return rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
}

/** Atomic IndexedDB archive store: failed validation never writes a partial import. */
export function createSnapshotStore({ indexedDBImpl = globalThis.indexedDB, dbName = 'gods-eye-view', storeName = 'offline-snapshots' } = {}) {
  if (!indexedDBImpl) throw new Error('IndexedDB is unavailable');
  const open = () => new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'snapshotId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const write = async (snapshotId, snapshot) => {
    const payload = await importOfflineSnapshot(snapshot);
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).put({ snapshotId, payload });
      request.onsuccess = () => resolve(payload);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  };
  return { import(snapshotId, snapshot) { return write(snapshotId, snapshot); } };
}
