import {
  createIndexedDbObservationStorage,
  createMemoryObservationStorage,
  createObservationLedger,
} from './ledger.js';

const DEFAULT_SOURCE_URL = 'https://github.com/JuanSanchez/gods-eye-view';
let ledger = null;

/**
 * Convert a layer context record into a durable, source-linked observation.
 * Missing provider provenance is represented as UNKNOWN rather than guessed.
 */
export function observationFromContextRecord(record, { now = Date.now } = {}) {
  if (!record?.id) return null;
  const sourceId = String(record.sourceId || record.source?.id || record.source || '').trim();
  if (!sourceId) return null;
  const receivedAt = new Date(now()).toISOString();
  const observedAt = record.observedAt || record.updatedAt || receivedAt;
  const coordinates = record.coordinates || record.position || null;
  return {
    observationId: `${sourceId}:${record.id}:${Date.parse(String(observedAt)) || Date.now()}`,
    entityKey: `${record.layerId || record.entityType || 'entity'}:${record.id}`,
    entityType: record.entityType || record.kind || record.layerId || 'entity',
    source: {
      id: sourceId,
      version: record.sourceVersion || null,
      url: record.sourceUrl || (record.source?.url ?? DEFAULT_SOURCE_URL),
      license: record.license || record.source?.license || null,
      attribution: record.attribution || record.source?.attribution || sourceId,
    },
    observedAt,
    receivedAt,
    validUntil: record.validUntil || null,
    geometry: record.geometry || (Array.isArray(coordinates) ? { type: 'Point', coordinates } : null),
    properties: record.properties || { label: record.label || record.name || null },
    derivation: record.derivation || ['normalized from a live layer context record'],
    uncertainty: record.uncertainty || null,
    confidence: record.confidence || null,
    quality: record.quality || null,
    status: record.status || (record.inferred ? 'INFERRED' : 'OBSERVED'),
  };
}

/** Start the local-first ledger. Browser storage failures degrade to memory. */
export async function initObservationLedger({ storage, now = Date.now } = {}) {
  if (ledger) return ledger;
  let selectedStorage = storage;
  if (!selectedStorage) {
    try {
      selectedStorage = createIndexedDbObservationStorage();
    } catch {
      selectedStorage = createMemoryObservationStorage();
    }
  }
  ledger = createObservationLedger({ storage: selectedStorage, now });
  try {
    await ledger.prune();
  } catch (error) {
    if (storage) throw error;
    // Private browsing and quota policies can reject IndexedDB after open.
    // The observatory remains usable, with this session's provenance retained
    // in memory until the browser permits durable storage again.
    ledger = createObservationLedger({ storage: createMemoryObservationStorage(), now });
  }
  if (typeof window !== 'undefined') window.__GEV_OBSERVATION_LEDGER__ = ledger;
  return ledger;
}

export function getObservationLedger() {
  return ledger;
}

export async function getLatestObservationForContext(record) {
  const current = getObservationLedger();
  const input = observationFromContextRecord(record);
  if (!current || !input) return null;
  const rows = await current.query({ entityKey: input.entityKey, limit: 1 });
  return rows[0] || null;
}

/** Persist a context record without making UI selection dependent on storage. */
export function recordContextObservation(record) {
  const current = getObservationLedger();
  const input = observationFromContextRecord(record);
  if (!current || !input) return Promise.resolve(null);
  return current.append(input).then((saved) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gev:observation-recorded', { detail: saved }));
    }
    return saved;
  }).catch((error) => {
    console.warn('[Observations] Could not persist context observation:', error);
    return null;
  });
}
