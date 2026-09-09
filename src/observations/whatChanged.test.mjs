import assert from 'node:assert/strict';
import test from 'node:test';
import { compareObservationWindows, summarizeChanges } from './whatChanged.js';

test('classifies added, changed, unchanged, and not-observed records', () => {
  const result = compareObservationWindows(
    [{ entityKey: 'a', properties: { value: 1 } }, { entityKey: 'b', properties: { value: 1 } }],
    [{ entityKey: 'a', properties: { value: 2 } }, { entityKey: 'c', properties: { value: 1 } }],
  );
  assert.equal(result.changed.length, 1);
  assert.equal(result.added.length, 1);
  assert.equal(result.removed.length, 1);
  assert.match(result.removed[0].changeState, /NOT_OBSERVED/);
});

test('summaries label missing later data as partial coverage', () => {
  const summary = summarizeChanges(compareObservationWindows([{ entityKey: 'a' }], []));
  assert.equal(summary.interpretation, 'PARTIAL_COVERAGE');
});
