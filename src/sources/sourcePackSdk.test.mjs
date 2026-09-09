import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSourcePackHarness,
  createSourcePackRegistry,
  generateSourcePackSkeleton,
  loadLocalSourcePacks,
  validateSourcePack,
} from './sourcePackSdk.js';

const manifest = (overrides = {}) => ({
  id: 'public-weather', version: '1.0.0', displayName: 'Public Weather', description: 'Public weather observations', provider: 'NOAA',
  license: 'CC BY 4.0', attributionUrl: 'https://noaa.gov', permissions: ['public-network'], replayPolicy: 'REPLAYABLE', ...overrides,
});

test('validates and freezes source metadata and permissions', () => {
  const pack = validateSourcePack(manifest({ capabilities: ['map-entities', 'routes'] }));
  assert.equal(pack.id, 'public-weather');
  assert.equal(Object.isFrozen(pack), true);
  assert.deepEqual(pack.capabilities, ['map-entities', 'routes']);
});

test('rejects private or unrestricted permissions', () => {
  assert.throws(() => validateSourcePack(manifest({ permissions: ['private-network'] })), /forbidden permissions/);
  assert.throws(() => validateSourcePack(manifest({ replayPolicy: 'LIVE_MAGIC' })), /unsupported replay policy/);
});

test('registry replaces versions by stable pack id and enforces its cap', () => {
  const registry = createSourcePackRegistry({ maxPacks: 1 });
  registry.register(manifest());
  registry.register(manifest({ version: '1.1.0' }));
  assert.equal(registry.get('public-weather').manifest.version, '1.1.0');
  assert.throws(() => registry.register(manifest({ id: 'other' })), /limit reached/);
});

test('rejects unsupported capabilities, destinations, schemas, and layer contracts', () => {
  assert.throws(() => validateSourcePack(manifest({ capabilities: ['private-database'] })), /unsupported capabilities/);
  assert.throws(() => validateSourcePack(manifest({ networkAllowlist: ['*'] })), /invalid network destination/);
  assert.throws(() => validateSourcePack(manifest({ schemaVersion: 9 })), /unsupported source-pack schema/);
  assert.throws(() => validateSourcePack(manifest(), { layer: { id: 'x' } }), /must implement init/);
});

test('registry can install, toggle, and report a validated layer', () => {
  const registry = createSourcePackRegistry();
  const layer = { id: 'weather', init() {}, enable() {}, disable() {}, update() {}, destroy() {}, getStats() { return {}; } };
  const entry = registry.register(manifest(), layer);
  assert.equal(entry.enabled, false);
  assert.equal(registry.setEnabled('public-weather', true), true);
  assert.equal(registry.get('public-weather').health, 'READY');
  assert.equal(registry.setEnabled('public-weather', false), false);
});

test('harness and generator provide deterministic contributor seams', async () => {
  const harness = createSourcePackHarness({ now: 100 });
  harness.clock.advance(25);
  await harness.fetch('https://example.org/data');
  assert.equal(harness.clock.now(), 125);
  assert.equal(harness.calls.length, 1);
  const skeleton = generateSourcePackSkeleton('public-air', { displayName: 'Public Air' });
  assert.ok(skeleton.files['manifest.js'].includes("id: 'public-air'"));
  assert.ok(skeleton.files['DATA_SOURCES.fragment.md'].includes('Public Air'));
});

test('local loader reports malformed packs without executing remote modules', () => {
  const registry = createSourcePackRegistry();
  const results = loadLocalSourcePacks(registry, {
    './good/index.js': { default: manifest({ id: 'good-pack' }) },
    'https://remote.example/pack.js': { default: manifest({ id: 'remote-pack' }) },
  });
  assert.deepEqual(results.map(({ ok }) => ok), [true, false]);
  assert.equal(registry.list().length, 1);
});
