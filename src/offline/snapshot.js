export const SNAPSHOT_SCHEMA_VERSION = 1;
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024;

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

export async function exportOfflineSnapshot({ observations = [], view = null, layers = [] } = {}) {
  if (!Array.isArray(observations) || !Array.isArray(layers)) throw new TypeError('observations and layers must be arrays');
  const payload = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    observations,
    view,
    layers: layers.map(String),
  };
  const canonicalPayload = canonical(payload);
  return {
    format: 'gods-eye-view/offline-snapshot',
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    integrity: { algorithm: 'SHA-256', digest: await digest(canonicalPayload) },
    payload,
  };
}

export async function importOfflineSnapshot(snapshot, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (!snapshot || snapshot.format !== 'gods-eye-view/offline-snapshot') throw new TypeError('unsupported snapshot format');
  if (snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || snapshot.payload?.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) throw new Error('unsupported snapshot schema');
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > maxBytes) throw new RangeError('snapshot exceeds size limit');
  const expected = await digest(canonical(snapshot.payload));
  if (expected !== snapshot.integrity?.digest) throw new Error('snapshot integrity check failed');
  if (!Array.isArray(snapshot.payload.observations) || !Array.isArray(snapshot.payload.layers)) throw new TypeError('snapshot payload is malformed');
  return structuredClone(snapshot.payload);
}
