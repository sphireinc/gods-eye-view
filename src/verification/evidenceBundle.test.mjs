import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvidenceBundle, renderOsmNoteDraft } from './evidenceBundle.js';

test('creates a local evidence bundle with redacted, source-linked fields', () => {
  const bundle = createEvidenceBundle({ entity: { id: 'osm-1', label: 'Example road', latitude: 40, longitude: -73, sourceUrl: 'https://osm.org/1' }, reportType: 'wrong-location', note: 'The public geometry appears offset.', observations: [{ observationId: 'obs-1', sourceId: 'osm', observedAt: '2026-09-09T12:00:00Z', sourceUrl: 'https://osm.org/1' }] });
  assert.equal(bundle.reportType, 'wrong-location');
  assert.match(renderOsmNoteDraft(bundle), /has not submitted/);
});

test('rejects unsupported reports before any submission path exists', () => {
  assert.throws(() => createEvidenceBundle({ entity: { id: 'x' }, reportType: 'auto-edit' }), /supported/);
});
