import assert from 'node:assert/strict';
import test from 'node:test';
import { createInputController, prefersReducedMotion } from './inputController.js';

test('routes keyboard commands through one input-independent command surface', () => {
  const calls = [];
  const controller = createInputController({ announce: (command) => calls.push(`announce:${command}`) });
  controller.register('camera-north', () => calls.push('north'));
  const event = { key: 'ArrowUp', preventDefault: () => calls.push('prevented') };
  assert.equal(controller.handleKey(event), true);
  assert.deepEqual(calls, ['north', 'announce:camera-north', 'prevented']);
});

test('detects reduced-motion preference without requiring a browser', () => {
  assert.equal(prefersReducedMotion({ matchMedia: () => ({ matches: true }) }), true);
  assert.equal(prefersReducedMotion({ matchMedia: () => ({ matches: false }) }), false);
});
