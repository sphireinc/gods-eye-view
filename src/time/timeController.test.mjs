import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createObservationRecorder,
  createReplayCursor,
  createTimeController,
  REPLAY_STATES,
  TIME_MODES,
} from './timeController.js';
import { createReplaySession } from './replaySession.js';
import { decodeTimeShareState, encodeTimeShareState } from './timeShare.js';

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
  assert.deepEqual(
    cursor.at('2026-09-09T12:03:00Z')
      .filter(({ state }) => state === REPLAY_STATES.OBSERVED)
      .map(({ record }) => record.properties),
    [{ altitude: 100 }],
  );
  assert.equal(
    cursor.at('2026-09-09T12:00:00Z').find(({ entityKey }) => entityKey === 'ship:1').state,
    REPLAY_STATES.UNAVAILABLE,
  );
});

test('replay session exposes a network-disabled frame stream from an archive', () => {
  const frames = [];
  const session = createReplaySession({ formatVersion: 1, records: [
    { entityKey: 'quake:1', observedAt: '2026-09-09T12:00:00Z', status: 'OBSERVED' },
    { entityKey: 'quake:1', observedAt: '2026-09-09T12:10:00Z', status: 'OBSERVED' },
  ] }, { onFrame: (frame) => frames.push(frame) });
  session.controller.enterReplay({ start: '2026-09-09T12:00:00Z', end: '2026-09-09T12:10:00Z' });
  session.controller.seek('2026-09-09T12:05:00Z');
  assert.equal(frames.at(-1).network, 'DISABLED_IN_REPLAY');
  assert.equal(frames.at(-1).records[0].record.observedAt, '2026-09-09T12:00:00Z');
  session.close();
});

test('cursor interpolates only bounded numeric positions and marks the result honestly', () => {
  const cursor = createReplayCursor([
    { entityKey: 'ship:1', observedAt: '2026-09-09T12:00:00Z', position: [0, 0], layerId: 'ships' },
    { entityKey: 'ship:1', observedAt: '2026-09-09T12:10:00Z', position: [10, 20], layerId: 'ships' },
  ], { interpolate: true });
  const result = cursor.at('2026-09-09T12:05:00Z')[0];
  assert.equal(result.state, REPLAY_STATES.INTERPOLATED);
  assert.deepEqual(result.record.position, [5, 10]);
  assert.deepEqual(result.sourceRecords.map(({ observedAt }) => observedAt), [
    '2026-09-09T12:00:00Z',
    '2026-09-09T12:10:00Z',
  ]);
});

test('cursor refuses interpolation across a missing interval and honors layer opt-out', () => {
  const cursor = createReplayCursor([
    { entityKey: 'ship:1', observedAt: '2026-09-09T12:00:00Z', position: [0, 0], layerId: 'ships' },
    { entityKey: 'ship:1', observedAt: '2026-09-09T13:00:00Z', position: [10, 20], layerId: 'ships' },
    { entityKey: 'quake:1', observedAt: '2026-09-09T12:00:00Z', properties: {}, layerId: 'quakes' },
  ], { interpolate: true, maxGapMs: 10 * 60 * 1000, layerPolicies: { quakes: 'unavailable' } });
  assert.equal(cursor.at('2026-09-09T12:30:00Z').find(({ entityKey }) => entityKey === 'ship:1').state, REPLAY_STATES.OBSERVED);
  assert.equal(cursor.at('2026-09-09T12:30:00Z').find(({ entityKey }) => entityKey === 'quake:1').state, REPLAY_STATES.UNAVAILABLE);
});

test('bounded recorder evicts oldest observations and exports a portable archive', () => {
  const recorder = createObservationRecorder({ maxRecords: 2, maxBytes: 10_000 });
  assert.equal(recorder.append([
    { entityKey: 'one', observedAt: '2026-09-09T12:00:00Z' },
    { entityKey: 'two', observedAt: '2026-09-09T12:01:00Z' },
    { entityKey: 'three', observedAt: '2026-09-09T12:02:00Z' },
  ]), 3);
  assert.deepEqual(recorder.snapshot().records.map(({ entityKey }) => entityKey), ['two', 'three']);
  assert.match(recorder.exportJson(), /"formatVersion":1/);
});

test('time share state is versioned, bounded, and rejects arbitrary history claims', () => {
  const query = encodeTimeShareState({
    recordingId: 'archive-2026-09',
    start: '2026-09-09T12:00:00Z',
    end: '2026-09-09T13:00:00Z',
    playhead: '2026-09-09T12:30:00Z',
  });
  assert.deepEqual(decodeTimeShareState(query), {
    version: 'gev-time-1',
    recordingId: 'archive-2026-09',
    start: '2026-09-09T12:00:00.000Z',
    end: '2026-09-09T13:00:00.000Z',
    playhead: '2026-09-09T12:30:00.000Z',
  });
  assert.equal(decodeTimeShareState('?timeVersion=gev-time-0&recordingId=secret'), null);
});

test('closing a replay session cancels all downstream frame subscribers', () => {
  let frames = 0;
  const session = createReplaySession({ formatVersion: 1, records: [
    { entityKey: 'a', observedAt: '2026-09-09T12:00:00Z' },
  ] }, { onFrame: () => {} });
  session.subscribe(() => { frames += 1; });
  session.close();
  session.controller.enterReplay({ start: '2026-09-09T12:00:00Z', end: '2026-09-09T12:01:00Z' });
  assert.equal(frames, 0);
});
