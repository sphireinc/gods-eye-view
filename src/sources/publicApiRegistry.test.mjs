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

test('requires source documentation to be HTTPS and preserves capability labels', () => {
  assert.throws(() => validatePublicApiSource({ id: 'safe', name: 'Safe', domain: 'news', safety: 'context', redistribution: 'review' }), /HTTPS/);
  const source = validatePublicApiSource({ id: 'safe', name: 'Safe', domain: 'news', safety: 'context', redistribution: 'review', documentationUrl: 'https://example.org/docs', capabilities: ['events'] });
  assert.deepEqual(source.capabilities, ['events']);
});
