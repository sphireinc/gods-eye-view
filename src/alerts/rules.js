export const ALERT_STATES = Object.freeze({ UNKNOWN: 'UNKNOWN', ABSENT: 'ABSENT', PRESENT: 'PRESENT' });
const OPERATORS = Object.freeze({
  eq: (a, b) => a === b, neq: (a, b) => a !== b, gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b), lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b), contains: (a, b) => String(a ?? '').toLowerCase().includes(String(b).toLowerCase()),
});
const PREDICATES = new Set(['threshold', 'change', 'appearance', 'disappearance', 'source-health', 'freshness', 'enter', 'exit']);
const FORBIDDEN_FIELDS = /(?:person|face|biometric|identity|email|phone|address|token|secret|password)/i;
const FORBIDDEN_TYPES = new Set(['person', 'individual', 'face']);

function fieldValue(record, path) { return String(path).split('.').reduce((value, key) => value?.[key], record); }

function validateArea(area) {
  if (!area) return null;
  const [west, south, east, north] = [area.west, area.south, area.east, area.north].map(Number);
  if (![west, south, east, north].every(Number.isFinite) || south < -90 || north > 90 || south > north || west < -180 || east > 180) {
    throw new RangeError('area must be a bounded geographic rectangle');
  }
  return { west, south, east, north };
}

export function validateAlertRule(rule) {
  if (!rule || typeof rule !== 'object') throw new TypeError('alert rule is required');
  const id = String(rule.id || '').trim();
  const entityType = String(rule.entityType || '').trim().toLowerCase();
  const predicate = String(rule.predicate || (rule.operator ? 'threshold' : '')).toLowerCase();
  if (!id) throw new TypeError('alert rule id is required');
  if (!entityType || FORBIDDEN_TYPES.has(entityType)) throw new TypeError('alert entity type must be public and non-person');
  if (!PREDICATES.has(predicate)) throw new TypeError(`unsupported alert predicate: ${predicate}`);
  const field = String(rule.field || 'properties.value');
  if (FORBIDDEN_FIELDS.test(field) || FORBIDDEN_FIELDS.test(JSON.stringify(rule.value || ''))) throw new Error('alert field is privacy-restricted');
  if (predicate === 'threshold' && !OPERATORS[rule.operator]) throw new TypeError(`unsupported alert operator: ${rule.operator}`);
  const evaluationRateMs = Math.max(1000, Number(rule.evaluationRateMs || 1000));
  if (!Number.isFinite(evaluationRateMs)) throw new RangeError('evaluation rate must be finite');
  return Object.freeze({
    id, name: String(rule.name || rule.label || id), enabled: rule.enabled !== false, entityType,
    area: validateArea(rule.area), predicate, field, operator: rule.operator || null, value: rule.value,
    debounceMs: Math.max(0, Number(rule.debounceMs || 0)), cooldownMs: Math.max(0, Number(rule.cooldownMs || 0)),
    severity: String(rule.severity || 'info'), delivery: String(rule.delivery || 'in-app'), evaluationRateMs,
  });
}

function inArea(record, area) {
  if (!area) return true;
  const coordinates = record?.geometry?.coordinates || [];
  const [lon, lat] = coordinates.map(Number);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  return lat >= area.south && lat <= area.north
    && (area.west <= area.east ? lon >= area.west && lon <= area.east : lon >= area.west || lon <= area.east);
}

function predicateMatch(rule, record, previous) {
  if (!record || record.entityType !== rule.entityType || !inArea(record, rule.area)) return false;
  if (rule.predicate === 'threshold') return OPERATORS[rule.operator](fieldValue(record, rule.field), rule.value);
  if (rule.predicate === 'change') return previous != null && fieldValue(record, rule.field) !== fieldValue(previous, rule.field);
  if (rule.predicate === 'appearance' || rule.predicate === 'enter') return previous == null;
  if (rule.predicate === 'disappearance' || rule.predicate === 'exit') return previous != null && record.__alertAbsent === true;
  if (rule.predicate === 'source-health') return String(record.source?.health || record.health || '').toLowerCase() === String(rule.value).toLowerCase();
  if (rule.predicate === 'freshness') return Number(record.ageMs ?? record.sourceAgeMs) >= Number(rule.value);
  return false;
}

export function createAlertEngine({ rules = [], now = () => Date.now(), state = {} } = {}) {
  const registered = new Map();
  const runtime = new Map(Object.entries(state));
  const history = [];
  for (const rule of rules) { const validated = validateAlertRule(rule); registered.set(validated.id, validated); }
  const emit = (rule, record, previous, stateName, reason) => {
    const current = now();
    const old = runtime.get(rule.id) || {};
    if (current - (old.triggeredAt || -Infinity) < rule.cooldownMs) return null;
    const event = Object.freeze({
      ruleId: rule.id, name: rule.name, severity: rule.severity, state: stateName,
      observationId: record?.observationId || null, sourceObservationIds: [record?.observationId, previous?.observationId].filter(Boolean),
      before: previous ? fieldValue(previous, rule.field) : null, after: record ? fieldValue(record, rule.field) : null,
      triggeredAt: current, reason,
    });
    runtime.set(rule.id, { state: stateName, triggeredAt: current });
    history.push(event);
    return event;
  };
  return {
    add(rule) { const validated = validateAlertRule(rule); registered.set(validated.id, validated); return validated; },
    remove(id) { runtime.delete(id); return registered.delete(id); },
    list() { return [...registered.values()]; },
    getState(id) { return runtime.get(id)?.state || ALERT_STATES.UNKNOWN; },
    getHistory() { return [...history]; },
    exportState() { return Object.fromEntries(runtime); },
    evaluate(record, { previous = null, sourceAvailable = true } = {}) {
      const matches = [];
      for (const rule of registered.values()) {
        if (!rule.enabled || record?.entityType !== rule.entityType) continue;
        if (!sourceAvailable) { runtime.set(rule.id, { ...runtime.get(rule.id), state: ALERT_STATES.UNKNOWN }); continue; }
        const matched = predicateMatch(rule, record, previous);
        const nextState = matched ? ALERT_STATES.PRESENT : ALERT_STATES.ABSENT;
        const oldState = runtime.get(rule.id)?.state || ALERT_STATES.UNKNOWN;
        runtime.set(rule.id, { ...runtime.get(rule.id), state: nextState });
        if (!matched) continue;
        const transition = oldState !== ALERT_STATES.PRESENT || rule.predicate === 'threshold';
        if (transition) {
          const event = emit(rule, record, previous, nextState, `${rule.predicate}: ${rule.field} ${rule.operator || ''} ${String(rule.value ?? '')}`.trim());
          if (event) matches.push(event);
        }
      }
      return matches;
    },
  };
}

/** IndexedDB persistence seam for rule transition state and event history. */
export function createAlertStateStore({ indexedDBImpl = globalThis.indexedDB, dbName = 'gods-eye-view', storeName = 'alert-state' } = {}) {
  if (!indexedDBImpl) throw new Error('IndexedDB is unavailable');
  const open = () => new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return {
    async save(key, value) { const db = await open(); return new Promise((resolve, reject) => { const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value, key); request.onsuccess = resolve; request.onerror = () => reject(request.error); }); },
    async load(key) { const db = await open(); return new Promise((resolve, reject) => { const request = db.transaction(storeName).objectStore(storeName).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); },
  };
}
