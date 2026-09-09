/**
 * Local-first observation ledger.
 *
 * The ledger stores normalized observations, not Cesium entities or raw
 * provider payloads. This keeps provenance portable and prevents rendering
 * implementation details from becoming durable application state.
 */

export const OBSERVATION_SCHEMA_VERSION = 1;
export const OBSERVATION_STATUSES = Object.freeze([
  'OBSERVED',
  'MODELED',
  'INFERRED',
  'STALE',
  'UNKNOWN',
]);

const VALID_STATUSES = new Set(OBSERVATION_STATUSES);
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_BYTES = 250 * 1024 * 1024;
const DB_NAME = 'gev-observations';
const STORE_NAME = 'observations';

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function finiteTime(value, field) {
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
  if (!Number.isFinite(time)) throw new TypeError(`${field} must be a valid timestamp`);
  return new Date(time).toISOString();
}

function requiredText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function normalizeSource(source) {
  if (!source || typeof source !== 'object') throw new TypeError('source is required');
  return {
    id: requiredText(source.id, 'source.id'),
    version: source.version == null ? null : String(source.version),
    url: source.url == null ? null : String(source.url),
    license: source.license == null ? null : String(source.license),
    attribution: source.attribution == null ? null : String(source.attribution),
  };
}

function normalizeConfidence(confidence) {
  if (confidence == null) return null;
  if (typeof confidence !== 'object') throw new TypeError('confidence must be an object');
  return {
    band: confidence.band == null ? null : String(confidence.band),
    basis: confidence.basis == null ? null : String(confidence.basis),
  };
}

/** Normalize and validate one provider observation. */
export function normalizeObservation(input, { now = Date.now } = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('observation must be an object');
  const status = String(input.status || 'OBSERVED').toUpperCase();
  if (!VALID_STATUSES.has(status)) throw new TypeError(`unsupported observation status: ${status}`);
  const receivedAt = input.receivedAt == null ? new Date(now()).toISOString() : finiteTime(input.receivedAt, 'receivedAt');
  const observation = {
    schemaVersion: OBSERVATION_SCHEMA_VERSION,
    observationId: requiredText(input.observationId, 'observationId'),
    entityKey: requiredText(input.entityKey, 'entityKey'),
    entityType: requiredText(input.entityType, 'entityType'),
    source: normalizeSource(input.source),
    observedAt: finiteTime(input.observedAt ?? receivedAt, 'observedAt'),
    receivedAt,
    validUntil: input.validUntil == null ? null : finiteTime(input.validUntil, 'validUntil'),
    geometry: input.geometry == null ? null : clone(input.geometry),
    properties: input.properties == null ? {} : clone(input.properties),
    derivation: Array.isArray(input.derivation) ? input.derivation.map(String) : [],
    uncertainty: input.uncertainty == null ? null : clone(input.uncertainty),
    confidence: normalizeConfidence(input.confidence),
    quality: input.quality == null ? null : clone(input.quality),
    status,
  };
  return Object.freeze(observation);
}

function estimateBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/** In-memory storage adapter used by tests and non-browser callers. */
export function createMemoryObservationStorage(seed = []) {
  const records = new Map(seed.map((record) => [record.observationId, clone(record)]));
  return {
    async put(record) { records.set(record.observationId, clone(record)); },
    async get(id) { return records.has(id) ? clone(records.get(id)) : null; },
    async values() { return [...records.values()].map(clone); },
    async delete(id) { records.delete(id); },
    async clear() { records.clear(); },
  };
}

/** Create the browser's IndexedDB-backed storage adapter. */
export function createIndexedDbObservationStorage({ indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) throw new Error('IndexedDB is unavailable');
  let databasePromise;
  const database = () => {
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, OBSERVATION_SCHEMA_VERSION);
        request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'observationId' });
          store.createIndex('receivedAt', 'receivedAt');
          store.createIndex('entityKey', 'entityKey');
          store.createIndex('sourceId', 'source.id');
        };
        request.onsuccess = () => resolve(request.result);
      });
    }
    return databasePromise;
  };
  const transact = async (mode, operation) => {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const result = operation(transaction.objectStore(STORE_NAME));
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
      transaction.oncomplete = () => resolve(result?.result ?? result);
    });
  };
  return {
    put: (record) => transact('readwrite', (store) => store.put(record)),
    get: (id) => transact('readonly', (store) => store.get(id)),
    values: () => transact('readonly', (store) => store.getAll()),
    delete: (id) => transact('readwrite', (store) => store.delete(id)),
    clear: () => transact('readwrite', (store) => store.clear()),
  };
}

/**
 * Create a bounded observation ledger.
 * @param {object} [options]
 * @param {object} [options.storage] Storage adapter.
 * @param {number} [options.retentionMs] Maximum record age.
 * @param {number} [options.maxBytes] Approximate byte budget.
 * @param {() => number} [options.now] Clock function.
 */
export function createObservationLedger({
  storage = createIndexedDbObservationStorage(),
  retentionMs = DEFAULT_RETENTION_MS,
  maxBytes = DEFAULT_MAX_BYTES,
  now = Date.now,
} = {}) {
  if (!storage?.put || !storage?.values || !storage?.delete) throw new TypeError('invalid observation storage adapter');
  const prune = async () => {
    const cutoff = now() - retentionMs;
    const records = await storage.values();
    const expired = records.filter((record) => Date.parse(record.receivedAt) < cutoff);
    await Promise.all(expired.map((record) => storage.delete(record.observationId)));
    const kept = records
      .filter((record) => !expired.some((item) => item.observationId === record.observationId))
      .sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
    let bytes = kept.reduce((total, record) => total + estimateBytes(record), 0);
    let removedForBudget = 0;
    for (const record of kept) {
      if (bytes <= maxBytes) break;
      await storage.delete(record.observationId);
      bytes -= estimateBytes(record);
      removedForBudget += 1;
    }
    return {
      removed: expired.length + removedForBudget,
      remaining: kept.length - removedForBudget,
    };
  };
  return {
    async append(input) {
      const record = normalizeObservation(input, { now });
      await storage.put(record);
      await prune();
      return clone(record);
    },
    async get(observationId) {
      const record = await storage.get(observationId);
      return record ? clone(record) : null;
    },
    async query({ entityKey, sourceId, from, to, limit = 500 } = {}) {
      const fromTime = from == null ? -Infinity : Date.parse(from);
      const toTime = to == null ? Infinity : Date.parse(to);
      return (await storage.values())
        .filter((record) => (!entityKey || record.entityKey === entityKey))
        .filter((record) => (!sourceId || record.source.id === sourceId))
        .filter((record) => {
          const time = Date.parse(record.observedAt);
          return time >= fromTime && time <= toTime;
        })
        .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))
        .slice(0, Math.max(0, Number(limit) || 0))
        .map(clone);
    },
    async export({ entityKey, from, to } = {}) {
      const records = await this.query({ entityKey, from, to, limit: Number.MAX_SAFE_INTEGER });
      return {
        schemaVersion: OBSERVATION_SCHEMA_VERSION,
        exportedAt: new Date(now()).toISOString(),
        records,
      };
    },
    prune,
    async clear() { await storage.clear?.(); },
  };
}
