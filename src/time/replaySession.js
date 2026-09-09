import { createReplayCursor, createTimeController, REPLAY_STATES } from './timeController.js';

/**
 * Bind an exported observation archive to the deterministic clock. The host
 * can render `subscribe` snapshots without allowing live polling to leak into
 * a replay session.
 */
export function createReplaySession(archive, {
  controller = createTimeController(),
  onFrame = () => {},
  interpolate = false,
  maxGapMs,
  layerPolicies,
} = {}) {
  if (!archive || archive.formatVersion !== 1 || !Array.isArray(archive.records)) {
    throw new TypeError('replay archive must be formatVersion 1 with records');
  }
  const cursor = createReplayCursor(archive.records, { interpolate, maxGapMs, layerPolicies });
  const bounds = cursor.bounds();
  if (!bounds) throw new RangeError('replay archive contains no timestamped observations');
  controller.setWindow(bounds.start, bounds.end);
  let closed = false;
  const subscribers = new Set();
  const unsubscribe = controller.subscribe((state) => {
    if (closed) return;
    if (state.mode === 'REPLAY' || state.mode === 'PAUSED_LIVE') {
      const frame = {
        state,
        records: cursor.at(state.playhead),
        network: 'DISABLED_IN_REPLAY',
        screenshotTimestamp: new Date(state.playhead).toISOString(),
      };
      onFrame(frame);
      for (const listener of subscribers) listener(frame);
    }
  });
  return {
    controller,
    cursor,
    bounds,
    subscribe(listener) {
      if (closed || typeof listener !== 'function') return () => {};
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    close() {
      if (closed) return;
      closed = true;
      subscribers.clear();
      unsubscribe();
    },
  };
}

export { REPLAY_STATES };
