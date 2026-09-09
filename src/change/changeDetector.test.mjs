import assert from 'node:assert/strict';
import test from 'node:test';
import { compareObservations, summarizeChangeResult } from './changeDetector.js';
test('returns deterministic explainable appearance, delta, and source changes', () => { const result = compareObservations([{ id: 'a', value: 1, sourceId: 'old' }], [{ id: 'a', value: 3, sourceId: 'new' }, { id: 'b' }], { numericThreshold: 0.5 }); assert.deepEqual(result.map((item) => item.kind), ['INCREASED', 'NEW', 'SOURCE_CHANGED']); assert.equal(result.find((item) => item.kind === 'INCREASED').delta, 2); });
test('distinguishes removals in the summary', () => { const summary = summarizeChangeResult(compareObservations([{ id: 'gone' }], [])); assert.equal(summary.counts.REMOVED, 1); assert.match(summary.caveat, /absence/); });
