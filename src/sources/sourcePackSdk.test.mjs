import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourcePackRegistry, validateSourcePack } from './sourcePackSdk.js';

const manifest = (overrides = {}) => ({
  id: 'public-weather', version: '1.0.0', name: 'Public Weather', source: 'NOAA',
  attribution: 'NOAA', permissions: ['public-network'], replayPolicy: 'REPLAYABLE', ...overrides,
});

test('validates and freezes source metadata and permissions', () => {
  const pack = validateSourcePack(manifest({ capabilities: ['points', 'timeseries'] }));
  assert.equal(pack.id, 'public-weather');
  assert.equal(Object.isFrozen(pack), true);
  assert.deepEqual(pack.capabilities, ['points', 'timeseries']);
});

test('rejects private or unrestricted permissions', () => {
  assert.throws(() => validateSourcePack(manifest({ permissions: ['private-network'] })), /forbidden permissions/);
  assert.throws(() => validateSourcePack(manifest({ replayPolicy: 'LIVE_MAGIC' })), /unsupported replay policy/);
});

test('registry replaces versions by stable pack id and enforces its cap', () => {
  const registry = createSourcePackRegistry({ maxPacks: 1 });
  registry.register(manifest());
  registry.register(manifest({ version: '1.1.0' }));
  assert.equal(registry.get('public-weather').version, '1.1.0');
  assert.throws(() => registry.register(manifest({ id: 'other' })), /limit reached/);
});
