import assert from 'node:assert/strict';
import test from 'node:test';
import { createMissionLibrary, validateMission } from './missionAuthoring.js';
import { createMissionRunner } from './missionRunner.js';

test('validates public-observatory missions and normalizes locations', () => {
  const mission = validateMission({ title: 'Morning Earthquake Watch', layers: ['earthquakes', 'earthquakes'], locations: [{ label: 'Region', latitude: 40, longitude: -73 }] });
  assert.deepEqual(mission.layers, ['earthquakes']);
  assert.equal(mission.purpose, 'public understanding');
});

test('rejects operational or tactical mission language', () => {
  assert.throws(() => validateMission({ title: 'Target aircraft', description: 'intercept route' }), /boundary/);
});

test('library replaces saved versions by stable id', () => {
  const library = createMissionLibrary();
  library.save({ id: 'm1', title: 'One' });
  library.save({ id: 'm1', title: 'Updated' });
  assert.equal(library.list().length, 1);
  assert.equal(library.get('m1').title, 'Updated');
});

test('validates executable-free steps, requirements, assertions, and cleanup', () => {
  const mission = validateMission({
    title: 'Public signals lesson', requirements: ['earthquakes'], cleanup: 'restore',
    steps: [{ type: 'setLayers', enabled: ['earthquakes'] }, { type: 'flyTo', latitude: 40, longitude: -73, heightM: 5000 }],
    assertions: [{ type: 'step-complete', stepIndex: 1 }],
  });
  assert.equal(mission.steps.at(-1).type, 'end');
  assert.throws(() => validateMission({ title: 'Bad', steps: [{ type: 'narrate', script: 'fetch()' }] }), /executable/);
  assert.throws(() => validateMission({ title: 'Bad', steps: [{ type: 'unknown' }] }), /unsupported/);
});

test('runner restores the pre-mission snapshot and pauses on a failed assertion', async () => {
  const calls = [];
  const runner = createMissionRunner({
    snapshot: () => ({ camera: 'before' }), restore: async (value) => calls.push(['restore', value]),
    actions: {
      setStyle: async (style) => calls.push(['style', style]),
      assert: async () => false,
    },
  });
  const result = await runner.run({ title: 'Lesson', steps: [{ type: 'setStyle', style: 'normal' }], assertions: [{ type: 'step-complete', stepIndex: 0 }] });
  assert.equal(result.status, 'PAUSED');
  assert.match(result.reason, /ASSERTION_FAILED/);
  assert.deepEqual(calls, [['style', 'normal'], ['restore', { camera: 'before' }]]);
});

test('runner cancellation supersedes a pending await without advancing', async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const runner = createMissionRunner({ actions: { narrate: () => pending } });
  const run = runner.run({ title: 'Lesson', steps: [{ type: 'narrate', text: 'Observe' }] });
  runner.cancel('USER_CANCELLED');
  resolve();
  assert.equal((await run).reason, 'CANCELLED_AFTER_STEP');
});
