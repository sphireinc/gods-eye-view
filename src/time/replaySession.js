import { createReplayCursor, createTimeController } from './timeController.js';

/**
 * Bind an exported observation archive to the deterministic clock. The host
 * can render `subscribe` snapshots without allowing live polling to leak into
 * a replay session.
 */
export function createReplaySession(archive, { controller = createTimeController(), onFrame = () => {} } = {}) {
  if (!archive || !Array.isArray(archive.records)) throw new TypeError('replay archive must contain records');
  const cursor = createReplayCursor(archive.records);
  const bounds = cursor.bounds();
  if (!bounds) throw new RangeError('replay archive contains no timestamped observations');
  controller.setWindow(bounds.start, bounds.end);
  const emit = (state) => onFrame({
    state,
    records: cursor.at(state.playhead),
    network: 'DISABLED_IN_REPLAY',
  });
  const unsubscribe = controller.subscribe(emit);
  return {
    controller,
    cursor,
    bounds,
    subscribe(listener) {
      return controller.subscribe((state) => listener({ state, records: cursor.at(state.playhead) }));
    },
    close() { unsubscribe(); },
  };
}
