import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublicApiCatalog, validatePublicApiSource } from './publicApiRegistry.js';

test('catalogs public APIs with safety and redistribution metadata', () => {
  const sources = getPublicApiCatalog({ access: 'public' });
  assert.ok(sources.length >= 3);
  assert.ok(sources.every((source) => source.safety && source.redistribution));
  assert.equal(getPublicApiCatalog({ domain: 'connectivity' })[0].id, 'ioda');
});

test('rejects an API source without a supported safety domain', () => {
  assert.throws(() => validatePublicApiSource({ id: 'scanner', name: 'Scanner', domain: 'unknown', safety: 'none', redistribution: 'none' }), /supported domain/);
});
