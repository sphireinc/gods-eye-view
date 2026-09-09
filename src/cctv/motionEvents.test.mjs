import assert from 'node:assert/strict';
import test from 'node:test';
import { compareFrameSignatures, createMotionEvent } from './motionEvents.js';

test('detects pixel-signature change without object interpretation', () => {
  const result = compareFrameSignatures([0, 0, 0, 1], [0, .5, 0, 1], { threshold: .1 });
  assert.equal(result.changed, true);
  assert.match(result.interpretation, /does not identify/);
  assert.equal(createMotionEvent('cam-1', result).kind, 'frame-change');
});

test('returns unknown for incompatible frames', () => {
  assert.equal(compareFrameSignatures([1], [1, 2]).state, 'UNKNOWN');
});
