export const SOURCE_PACK_SCHEMA_VERSION = 1;
export const SOURCE_PACK_CAPABILITIES = Object.freeze(new Set([
  'map-entities', 'routes', 'imagery', 'video', 'audio', 'annotations',
]));
export const SOURCE_PACK_PERMISSIONS = Object.freeze(new Set([
  'public-network', 'public-cache', 'geolocation-approximate', 'client-visible-key',
]));
const LIFECYCLE = ['init', 'enable', 'disable', 'update', 'destroy'];
const REPLAY_POLICIES = new Set(['REPLAYABLE', 'STATIC', 'UNAVAILABLE']);

function required(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function url(value, field, { optional = true } = {}) {
  if (!value && optional) return null;
  try {
    const parsed = new URL(required(value, field));
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    return parsed.href;
  } catch (error) {
    throw new TypeError(`${field} must be an http(s) URL: ${error.message}`);
  }
}

function lifecycleError(id, method) {
  return new TypeError(`source pack ${id} layer must implement ${method}()`);
}

export function validateLayerModule(layer, { packId = 'unknown' } = {}) {
  if (!layer || typeof layer !== 'object') throw new TypeError(`source pack ${packId} layer is required`);
  const id = required(layer.id, 'layer.id');
  for (const method of LIFECYCLE) if (typeof layer[method] !== 'function') throw lifecycleError(id, method);
  if (typeof layer.getStats !== 'function') throw lifecycleError(id, 'getStats');
  return layer;
}

/** Validate a reviewed local source-pack manifest and its optional factory. */
export function validateSourcePack(manifest, { layer = null } = {}) {
  if (!manifest || typeof manifest !== 'object') throw new TypeError('source pack manifest is required');
  if (Number(manifest.schemaVersion ?? SOURCE_PACK_SCHEMA_VERSION) !== SOURCE_PACK_SCHEMA_VERSION) {
    throw new TypeError(`unsupported source-pack schema: ${manifest.schemaVersion}`);
  }
  const id = required(manifest.id, 'id');
  if (!/^[a-z0-9][a-z0-9-_.]{1,63}$/.test(id)) throw new TypeError('id must be a stable lowercase slug');
  const capabilities = [...new Set((manifest.capabilities || []).map(String))];
  const unsupported = capabilities.filter((capability) => !SOURCE_PACK_CAPABILITIES.has(capability));
  if (unsupported.length) throw new Error(`unsupported capabilities: ${unsupported.join(', ')}`);
  const permissions = [...new Set((manifest.permissions || []).map(String))];
  const forbidden = permissions.filter((permission) => !SOURCE_PACK_PERMISSIONS.has(permission));
  if (forbidden.length) throw new Error(`source pack requests forbidden permissions: ${forbidden.join(', ')}`);
  const destinations = [...new Set((manifest.networkAllowlist || []).map((host) => required(host, 'networkAllowlist')))].map((host) => {
    if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(host) || host.includes('..')) throw new TypeError(`invalid network destination: ${host}`);
    return host.toLowerCase();
  });
  const factory = manifest.layerFactory || manifest.factory;
  if (factory != null && typeof factory !== 'function') throw new TypeError('layerFactory must be a local function');
  if (layer) validateLayerModule(layer, { packId: id });
  const replayPolicy = String(manifest.replayPolicy || 'UNAVAILABLE').toUpperCase();
  if (!REPLAY_POLICIES.has(replayPolicy)) throw new TypeError(`unsupported replay policy: ${replayPolicy}`);
  return Object.freeze({
    schemaVersion: SOURCE_PACK_SCHEMA_VERSION,
    id,
    version: required(manifest.version, 'version'),
    displayName: required(manifest.displayName || manifest.name, 'displayName'),
    description: required(manifest.description, 'description'),
    provider: required(manifest.provider || manifest.source, 'provider'),
    license: required(typeof manifest.license === 'object' ? manifest.license.name : manifest.license, 'license'),
    attributionUrl: url(manifest.attributionUrl || manifest.licenseUrl, 'attributionUrl', { optional: false }),
    capabilities: Object.freeze(capabilities),
    permissions: Object.freeze(permissions),
    networkAllowlist: Object.freeze(destinations),
    privacyClass: required(manifest.privacyClass || 'public', 'privacyClass'),
    replayPolicy,
    maxResourceCost: Math.max(0, Number(manifest.maxResourceCost ?? 1)),
    clientVisibleKeys: Object.freeze((manifest.clientVisibleKeys || []).map(String)),
    serverOnlyKeys: Object.freeze((manifest.serverOnlyKeys || []).map(String)),
    configurationSchema: manifest.configurationSchema || { type: 'object', additionalProperties: false },
    layerFactory: factory || null,
  });
}

export function createSourcePackRegistry({ maxPacks = 32 } = {}) {
  if (!Number.isInteger(maxPacks) || maxPacks < 1) throw new RangeError('maxPacks must be positive');
  const packs = new Map();
  return {
    register(manifest, layer = null) {
      if (packs.size >= maxPacks && !packs.has(manifest?.id)) throw new RangeError('source-pack limit reached');
      const pack = validateSourcePack(manifest, { layer });
      if (layer) validateLayerModule(layer, { packId: pack.id });
      packs.set(pack.id, { manifest: pack, layer, enabled: false, health: 'DISABLED' });
      return packs.get(pack.id);
    },
    install(id, layer) {
      const entry = packs.get(id);
      if (!entry) throw new Error(`unknown source pack: ${id}`);
      validateLayerModule(layer, { packId: id });
      entry.layer = layer;
      return entry;
    },
    setEnabled(id, enabled) {
      const entry = packs.get(id);
      if (!entry) return false;
      entry.enabled = enabled === true;
      entry.health = entry.enabled ? 'READY' : 'DISABLED';
      return entry.enabled;
    },
    get(id) { return packs.get(id) || null; },
    list() { return [...packs.values()].map((entry) => ({ ...entry })); },
    unregister(id) { return packs.delete(id); },
  };
}

/** Test harness with deterministic clock, fetch allowlisting, and failure injection. */
export function createSourcePackHarness({ now = 0, fetchImpl = async () => ({ ok: true }), fail = {} } = {}) {
  let clock = Number(now);
  const calls = [];
  return {
    clock: { now: () => clock, advance(ms) { clock += Number(ms); return clock; } },
    fetch: async (input, options) => {
      calls.push({ input: String(input), options });
      if (fail.fetch) throw new Error('injected fetch failure');
      return fetchImpl(input, options);
    },
    calls,
    cesium: { entities: { values: [] }, dataSources: { values: [] } },
  };
}

export function generateSourcePackSkeleton(id, { displayName = id, directory = `src/sources/packs/${id}` } = {}) {
  const safeId = required(id, 'id').toLowerCase();
  return Object.freeze({
    directory,
    files: Object.freeze({
      'manifest.js': `export default { schemaVersion: 1, id: '${safeId}', version: '0.1.0', displayName: '${displayName}', description: 'A public-data source pack.', provider: 'Provider name', license: 'CC BY 4.0', attributionUrl: 'https://example.org/attribution', capabilities: ['map-entities'], permissions: ['public-network'], networkAllowlist: ['example.org'], privacyClass: 'public', replayPolicy: 'UNAVAILABLE', maxResourceCost: 1 };\n`,
      'layer.js': `export default { id: '${safeId}', name: '${displayName}', async init() {}, enable() {}, disable() {}, async update() {}, async destroy() {}, getStats() { return { count: 0, status: 'idle' }; } };\n`,
      'layer.test.mjs': `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport layer from './layer.js';\n\ntest('pack lifecycle is present', () => { for (const method of ['init', 'enable', 'disable', 'update', 'destroy', 'getStats']) assert.equal(typeof layer[method], 'function'); });\n`,
      'DATA_SOURCES.fragment.md': `### ${displayName}\n- Provider: Provider name\n- License: CC BY 4.0\n- Attribution: https://example.org/attribution\n- Privacy class: public\n`,
    }),
  });
}

/** Load reviewed local modules discovered at build time; remote URLs are never accepted. */
export function loadLocalSourcePacks(registry, modules = {}) {
  if (!registry?.register || !modules || typeof modules !== 'object') throw new TypeError('local pack modules are required');
  const results = [];
  for (const [path, imported] of Object.entries(modules)) {
    if (/^https?:\/\//i.test(path)) {
      results.push({ path, ok: false, error: 'remote source-pack modules are not permitted' });
      continue;
    }
    const pack = imported?.default || imported;
    try {
      const manifest = pack.manifest || pack;
      const layer = pack.layer || manifest.layer || null;
      results.push({ path, ok: true, pack: registry.register(manifest, layer) });
    } catch (error) {
      results.push({ path, ok: false, error: String(error.message || error) });
    }
  }
  return results;
}
