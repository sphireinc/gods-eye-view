import assert from 'node:assert/strict';
import test from 'node:test';
import { compareFrameSignatures, createMotionEvent } from './motionEvents.js';
import { sanitizeSceneEvent } from './motionEvents.js';

test('detects pixel-signature change without object interpretation', () => {
  const result = compareFrameSignatures([0, 0, 0, 1], [0, .5, 0, 1], { threshold: .1 });
  assert.equal(result.changed, true);
  assert.match(result.interpretation, /does not identify/);
  assert.equal(createMotionEvent('cam-1', result).kind, 'frame-change');
});

test('returns unknown for incompatible frames', () => {
  assert.equal(compareFrameSignatures([1], [1, 2]).state, 'UNKNOWN');
});

test('accepts only expiring reviewed scene events and rejects person-level output', () => {
  const result = sanitizeSceneEvent({ cameraId: 'cam', kind: 'VISIBILITY_REDUCED', observedAt: '2026-09-09T12:00:00Z', scoreBand: 'MEDIUM' }, { now: Date.parse('2026-09-09T12:01:00Z') });
  assert.equal(result.ok, true); assert.ok(result.value.expiresAt);
  assert.equal(sanitizeSceneEvent({ cameraId: 'cam', kind: 'person-count', observedAt: '2026-09-09T12:00:00Z' }).ok, false);
});
