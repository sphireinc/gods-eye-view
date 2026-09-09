import assert from 'node:assert/strict';
import test from 'node:test';
import { createReplayCursor, createTimeController, TIME_MODES } from './timeController.js';
import { createReplaySession } from './replaySession.js';

test('replay clock advances deterministically and pauses at the window end', () => {
  const clock = createTimeController({ liveNow: () => Date.parse('2026-09-09T14:00:00Z') });
  clock.enterReplay({ start: '2026-09-09T12:00:00Z', end: '2026-09-09T13:00:00Z' });
  clock.setRate(2);
  clock.tick(15 * 60 * 1000);
  assert.equal(clock.getState().playhead, Date.parse('2026-09-09T12:30:00Z'));
  clock.tick(30 * 60 * 1000);
  assert.equal(clock.getState().playhead, Date.parse('2026-09-09T13:00:00Z'));
  assert.equal(clock.getState().mode, TIME_MODES.PAUSED_LIVE);
});

test('seek clamps to the selected recording window and return-to-live invalidates the session', () => {
  const clock = createTimeController({ liveNow: () => Date.parse('2026-09-09T14:00:00Z') });
  clock.enterReplay({ start: '2026-09-09T12:00:00Z', end: '2026-09-09T13:00:00Z' });
  const session = clock.getState().sessionId;
  clock.seek('2020-01-01T00:00:00Z');
  assert.equal(clock.getState().playhead, Date.parse('2026-09-09T12:00:00Z'));
  clock.returnToLive();
  assert.equal(clock.getState().mode, TIME_MODES.LIVE);
  assert.equal(clock.getState().playhead, Date.parse('2026-09-09T14:00:00Z'));
  assert.ok(clock.getState().sessionId > session);
});

test('replay cursor never substitutes records from after the playhead', () => {
  const cursor = createReplayCursor([
    { entityKey: 'flight:1', observedAt: '2026-09-09T12:01:00Z', properties: { altitude: 100 } },
    { entityKey: 'flight:1', observedAt: '2026-09-09T12:05:00Z', properties: { altitude: 200 } },
    { entityKey: 'ship:1', observedAt: '2026-09-09T12:04:00Z', properties: { speed: 8 } },
  ]);
  assert.deepEqual(cursor.at('2026-09-09T12:03:00Z').map(({ record }) => record.properties), [{ altitude: 100 }]);
  assert.equal(cursor.at('2026-09-09T12:00:00Z').length, 0);
});

test('replay session exposes a network-disabled frame stream from an archive', () => {
  const frames = [];
  const session = createReplaySession({ records: [
    { entityKey: 'quake:1', observedAt: '2026-09-09T12:00:00Z', status: 'OBSERVED' },
    { entityKey: 'quake:1', observedAt: '2026-09-09T12:10:00Z', status: 'OBSERVED' },
  ] }, { onFrame: (frame) => frames.push(frame) });
  session.controller.enterReplay({ start: '2026-09-09T12:00:00Z', end: '2026-09-09T12:10:00Z' });
  session.controller.seek('2026-09-09T12:05:00Z');
  assert.equal(frames.at(-1).network, 'DISABLED_IN_REPLAY');
  assert.equal(frames.at(-1).records[0].record.observedAt, '2026-09-09T12:00:00Z');
  session.close();
});
