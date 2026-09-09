const SECRET_KEYS = /key|token|secret|password|authorization|cookie|credential/i;

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
        state: stats.state || (lastSuccess != null && now() - lastSuccess > staleAfterMs ? 'STALE' : 'UNKNOWN'),
      };
      providers.set(id, next);
      return publish();
    },
    get(id) { return providers.get(id) ? { ...providers.get(id) } : null; },
    snapshot() { return [...providers.values()].map((item) => ({ ...item })); },
    diagnostics() { return sanitizeProviderDiagnostics({ generatedAt: now(), providers: this.snapshot() }); },
  };
}
