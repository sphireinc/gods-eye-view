const SECRET_KEYS = /key|token|secret|password|authorization|cookie|credential/i;

export const PROVIDER_PRICING_VERSION = '2026-09-09';
export const PROVIDER_CATALOG = Object.freeze([
  { id: 'google-maps', label: 'Google Maps / 3D', group: 'maps', env: ['GOOGLE_MAPS_API_KEY'], unit: 'requests', unitCost: 0.007, approximate: true },
  { id: 'cesium-ion', label: 'Cesium ion', group: 'maps', env: ['CESIUM_ION_TOKEN'], unit: 'requests', unitCost: 0, approximate: true },
  { id: 'opensky', label: 'OpenSky', group: 'live data', env: ['OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'], unit: 'requests', unitCost: 0, approximate: true },
  { id: 'aisstream', label: 'AISStream', group: 'live data', env: ['AISSTREAM_API_KEY'], unit: 'requests', unitCost: 0, approximate: true },
  { id: 'tomtom', label: 'TomTom traffic', group: 'live data', env: ['TOMTOM_API_KEY'], unit: 'tile fetches', unitCost: 0, approximate: true },
  { id: 'firms', label: 'NASA FIRMS', group: 'live data', env: ['FIRMS_MAP_KEY'], unit: 'requests', unitCost: 0, approximate: true },
  { id: 'openai', label: 'OpenAI voice / summaries', group: 'voice', env: ['OPENAI_API_KEY'], unit: 'requests', unitCost: 0, approximate: true },
  { id: 'cctv', label: 'Public cameras', group: 'media', env: [], unit: 'requests', unitCost: 0, approximate: true },
]);

export function providerConfiguration(catalog = PROVIDER_CATALOG, env = {}) {
  return catalog.map((entry) => ({
    id: entry.id,
    label: entry.label,
    group: entry.group,
    configured: entry.env.length === 0 || entry.env.every((name) => String(env[name] || '').trim()),
    metered: entry.unitCost > 0,
    pricingVersion: PROVIDER_PRICING_VERSION,
  }));
}

export function estimateProviderCost(rows = [], catalog = PROVIDER_CATALOG) {
  const rates = new Map(catalog.map((item) => [item.id, Number(item.unitCost) || 0]));
  return Number(rows.reduce((total, row) => total + Math.max(0, Number(row?.attempts) || 0) * (rates.get(row?.id) || 0), 0).toFixed(4));
}

export function createPauseController(ids = []) {
  const paused = new Set();
  return {
    toggle(id, value) { if (!ids.includes(id)) return false; if (value === undefined ? !paused.has(id) : value) paused.add(id); else paused.delete(id); return paused.has(id); },
    isPaused(id) { return paused.has(id); },
    snapshot() { return ids.filter((id) => paused.has(id)); },
  };
}

export function classifyProviderFailure(error) {
  const status = Number(error?.status || error?.statusCode);
  if (status === 401 || status === 403) return 'AUTHENTICATION';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'UPSTREAM';
  if (error?.name === 'AbortError' || /timeout/i.test(String(error?.message))) return 'TIMEOUT';
  return 'NETWORK_OR_UNKNOWN';
}

export function sanitizeProviderDiagnostics(value) {
  if (Array.isArray(value)) return value.map(sanitizeProviderDiagnostics);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
    key,
    SECRET_KEYS.test(key) ? '[REDACTED]' : sanitizeProviderDiagnostics(nested),
  ]));
}

export function createProviderHealthStore({ now = () => Date.now(), staleAfterMs = 5 * 60 * 1000 } = {}) {
  const providers = new Map();
  const listeners = new Set();
  const publish = () => { const snapshot = [...providers.values()].map((item) => ({ ...item })); listeners.forEach((listener) => listener(snapshot)); return snapshot; };
  return {
    subscribe(listener) { listeners.add(listener); listener([...providers.values()].map((item) => ({ ...item }))); return () => listeners.delete(listener); },
    update(id, stats = {}) {
      const current = providers.get(id) || { id, attempts: 0, successes: 0, failures: 0 };
      const lastSuccess = stats.lastSuccess ?? current.lastSuccess ?? null;
      const lastAttempt = stats.lastAttempt ?? now();
      const next = {
        ...current,
        ...sanitizeProviderDiagnostics(stats),
        id,
        attempts: current.attempts + 1,
        successes: current.successes + (stats.success === true ? 1 : 0),
        failures: current.failures + (stats.success === false ? 1 : 0),
        lastAttempt,
        lastSuccess,
        state: stats.state || (stats.success === true ? 'HEALTHY' : (lastSuccess != null && now() - lastSuccess > staleAfterMs ? 'STALE' : 'UNKNOWN')),
      };
      providers.set(id, next);
      return publish();
    },
    get(id) { return providers.get(id) ? { ...providers.get(id) } : null; },
    snapshot() { return [...providers.values()].map((item) => ({ ...item })); },
    diagnostics() {
      const providersSnapshot = this.snapshot();
      return sanitizeProviderDiagnostics({ generatedAt: now(), pricingVersion: PROVIDER_PRICING_VERSION, providers: providersSnapshot, approximateCostUsd: estimateProviderCost(providersSnapshot) });
    },
  };
}
