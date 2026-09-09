import assert from 'node:assert/strict';
import test from 'node:test';
import { mosaicStatus, planCameraHandoff } from './cameraHandoff.js';

test('plans a bounded handoff without treating unavailable frames as live', () => {
  const slots = planCameraHandoff([{ id: 'a', region: 'harbor', operator: 'A', sourcePage: 'https://a', frameState: 'FRESH' }, { id: 'b', region: 'harbor', operator: 'B', sourcePage: 'https://b' }], { currentId: 'old', region: 'harbor' });
  assert.equal(slots.length, 2);
  assert.equal(slots[1].continuity, 'NO_CONTINUITY_CLAIM');
  assert.equal(mosaicStatus(slots).unavailable, 1);
});

test('empty handoff remains explicit', () => {
  assert.equal(mosaicStatus([]).state, 'NO_FRAME');
});
