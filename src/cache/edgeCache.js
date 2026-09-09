function sizeOf(value) { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }
function digest(value) { let hash = 2166136261; for (const char of JSON.stringify(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`; }

export function createBoundedEdgeCache({ maxBytes = 50 * 1024 * 1024, now = () => Date.now(), enabled = false } = {}) {
  const entries = new Map();
  const inFlight = new Map();
  let bytes = 0;
  const remove = (key) => { const existing = entries.get(key); if (existing) bytes -= existing.bytes; entries.delete(key); };
  const trim = () => { for (const [key, entry] of entries) { if (bytes <= maxBytes) break; remove(key); } };
  return {
    enabled,
    get(key, { allowStale = true } = {}) {
      if (!enabled) return { state: 'DISABLED', value: null };
      const entry = entries.get(key);
      if (!entry) return { state: 'MISS', value: null };
      const stale = now() > entry.expiresAt;
      if (stale && !allowStale) return { state: 'MISS', value: null };
      return { state: stale ? 'STALE' : 'FRESH', value: structuredClone(entry.value), acquiredAt: entry.acquiredAt, expiresAt: entry.expiresAt, sourceId: entry.sourceId };
    },
    async getOrFetch(key, fetcher, { sourceId = 'unknown', ttlMs = 60_000, staleTtlMs = ttlMs * 10, licenseClass = 'public-reuse-unknown' } = {}) {
      const cached = this.get(key, { allowStale: false });
      if (cached.state === 'FRESH') return cached;
      if (!enabled) return { state: 'BYPASS', value: await fetcher() };
      if (inFlight.has(key)) return inFlight.get(key);
      const pending = Promise.resolve().then(fetcher).then((value) => {
        const bytesForEntry = sizeOf(value);
        remove(key);
        const acquiredAt = now();
        entries.set(key, { value: structuredClone(value), bytes: bytesForEntry, sourceId, licenseClass, payloadHash: digest(value), acquiredAt, sourceTime: acquiredAt, expiresAt: acquiredAt + ttlMs, staleUntil: acquiredAt + staleTtlMs });
        bytes += bytesForEntry;
        trim();
        return this.get(key);
      }).finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
      return pending;
    },
    clear(sourceId = null) { for (const [key, entry] of entries) if (!sourceId || entry.sourceId === sourceId) remove(key); },
    invalidate(sourceId) { this.clear(sourceId); },
    export() { return { version: 1, generatedAt: now(), entries: [...entries.values()].map(({ value, ...metadata }) => ({ ...metadata, value: structuredClone(value) })) }; },
    stats() { return { enabled, entries: entries.size, bytes, maxBytes, sources: [...new Set([...entries.values()].map((entry) => entry.sourceId))] }; },
  };
}
