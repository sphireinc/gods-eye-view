const VALID_REPLAY_POLICIES = new Set(['REPLAYABLE', 'STATIC', 'UNAVAILABLE']);

function required(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

/** Validate a public source-pack manifest before it reaches the layer manager. */
export function validateSourcePack(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new TypeError('source pack manifest is required');
  const replayPolicy = String(manifest.replayPolicy || 'UNAVAILABLE').toUpperCase();
  if (!VALID_REPLAY_POLICIES.has(replayPolicy)) throw new TypeError(`unsupported replay policy: ${replayPolicy}`);
  if (!Array.isArray(manifest.permissions)) throw new TypeError('permissions must be an array');
  const permissions = [...new Set(manifest.permissions.map(String))];
  const forbidden = permissions.filter((permission) => !['public-network', 'public-cache', 'geolocation-approximate'].includes(permission));
  if (forbidden.length) throw new Error(`source pack requests forbidden permissions: ${forbidden.join(', ')}`);
  return Object.freeze({
    id: required(manifest.id, 'id'),
    version: required(manifest.version, 'version'),
    name: required(manifest.name, 'name'),
    source: required(manifest.source, 'source'),
    attribution: required(manifest.attribution, 'attribution'),
    licenseUrl: manifest.licenseUrl ? String(manifest.licenseUrl) : null,
    replayPolicy,
    permissions: Object.freeze(permissions),
    capabilities: Object.freeze(Array.isArray(manifest.capabilities) ? manifest.capabilities.map(String) : []),
  });
}

export function createSourcePackRegistry({ maxPacks = 32 } = {}) {
  const packs = new Map();
  return {
    register(manifest) {
      if (packs.size >= maxPacks && !packs.has(manifest?.id)) throw new RangeError('source-pack limit reached');
      const pack = validateSourcePack(manifest);
      packs.set(pack.id, pack);
      return pack;
    },
    get(id) { return packs.get(id) || null; },
    list() { return [...packs.values()]; },
    unregister(id) { return packs.delete(id); },
  };
}
