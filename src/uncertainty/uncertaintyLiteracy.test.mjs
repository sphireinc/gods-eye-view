import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUncertaintyLegend, explainUncertainty } from './uncertaintyLiteracy.js';

test('explains inferred and stale states without upgrading confidence', () => {
  const explanation = explainUncertainty({ status: 'INFERRED', confidence: { band: 'low', basis: 'two indirect signals' }, observedAt: '2026-09-09T12:00:00Z' });
  assert.equal(explanation.label, 'INFERRED');
  assert.equal(explanation.confidenceBand, 'low');
  assert.match(explanation.text, /inference/i);
  assert.match(explanation.details.join(' '), /two indirect signals/);
});

test('legend covers every canonical observation state', () => {
  assert.deepEqual(buildUncertaintyLegend().map((entry) => entry.status), ['OBSERVED', 'MODELED', 'INFERRED', 'STALE', 'UNKNOWN', 'UNAVAILABLE']);
});
