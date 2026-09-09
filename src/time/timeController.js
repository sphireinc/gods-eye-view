/** Deterministic clock and replay cursor for recorded public observations. */
export const TIME_MODES = Object.freeze({
  LIVE: 'LIVE',
  PAUSED_LIVE: 'PAUSED_LIVE',
  REPLAY: 'REPLAY',
  RETURNING_TO_LIVE: 'RETURNING_TO_LIVE',
});

const RATES = new Set([0.25, 0.5, 1, 2, 4, 8]);

function finiteTime(value, field) {
  const time = typeof value === 'number'
    ? value
    : value instanceof Date ? value.getTime() : Date.parse(String(value));
  if (!Number.isFinite(time)) throw new TypeError(`${field} must be a valid timestamp`);
  return time;
}

function snapshot(state) {
  return Object.freeze({ ...state });
}

/**
 * Create a replayable clock. `now` is injected so playback is testable and
 * repeatable; consumers subscribe rather than reading wall-clock time.
 */
export function createTimeController({ now = () => Date.now(), liveNow = now } = {}) {
  let state = {
    mode: TIME_MODES.LIVE,
    playhead: liveNow(),
    windowStart: null,
    windowEnd: null,
    rate: 1,
    sessionId: 0,
  };
  const listeners = new Set();
  const publish = () => {
    const value = snapshot(state);
    for (const listener of listeners) listener(value);
    return value;
  };
  const clamp = (time) => Math.min(state.windowEnd ?? time, Math.max(state.windowStart ?? time, time));
  return {
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      listeners.add(listener);
      listener(snapshot(state));
      return () => listeners.delete(listener);
    },
    getState() { return snapshot(state); },
    setWindow(start, end) {
      const windowStart = finiteTime(start, 'window start');
      const windowEnd = finiteTime(end, 'window end');
      if (windowEnd < windowStart) throw new RangeError('window end must not precede window start');
      state = { ...state, windowStart, windowEnd, playhead: Math.min(windowEnd, Math.max(windowStart, state.playhead)) };
      return publish();
    },
    enterReplay({ start, end, playhead = start } = {}) {
      const windowStart = finiteTime(start, 'window start');
      const windowEnd = finiteTime(end, 'window end');
      if (windowEnd < windowStart) throw new RangeError('window end must not precede window start');
      state = {
        ...state,
        mode: TIME_MODES.REPLAY,
        windowStart,
        windowEnd,
        playhead: Math.min(windowEnd, Math.max(windowStart, finiteTime(playhead, 'playhead'))),
        sessionId: state.sessionId + 1,
      };
      return publish();
    },
    play() {
      if (state.mode === TIME_MODES.REPLAY) return publish();
      state = { ...state, mode: TIME_MODES.REPLAY };
      return publish();
    },
    pause() {
      if (state.mode === TIME_MODES.REPLAY) state = { ...state, mode: TIME_MODES.PAUSED_LIVE };
      return publish();
    },
    setRate(rate) {
      const numeric = Number(rate);
      if (!RATES.has(numeric)) throw new RangeError(`unsupported playback rate: ${rate}`);
      state = { ...state, rate: numeric };
      return publish();
    },
    seek(value) {
      const playhead = clamp(finiteTime(value, 'playhead'));
      state = { ...state, playhead, mode: TIME_MODES.REPLAY };
      return publish();
    },
    tick(elapsedMs) {
      if (state.mode !== TIME_MODES.REPLAY) return snapshot(state);
      const elapsed = Number(elapsedMs);
      if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('elapsedMs must be non-negative');
      const next = state.playhead + elapsed * state.rate;
      if (state.windowEnd != null && next >= state.windowEnd) {
        state = { ...state, playhead: state.windowEnd, mode: TIME_MODES.PAUSED_LIVE };
      } else state = { ...state, playhead: clamp(next) };
      return publish();
    },
    returnToLive() {
      state = {
        ...state,
        mode: TIME_MODES.RETURNING_TO_LIVE,
        playhead: liveNow(),
        windowStart: null,
        windowEnd: null,
        sessionId: state.sessionId + 1,
      };
      const result = publish();
      state = { ...state, mode: TIME_MODES.LIVE };
      publish();
      return result;
    },
  };
}

/**
 * Build a deterministic cursor over normalized observations. Missing data is
 * returned as unavailable; no current/live record is substituted.
 */
export function createReplayCursor(records = []) {
  const sorted = [...records]
    .filter((record) => Number.isFinite(Date.parse(record?.observedAt)))
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  return {
    at(playhead) {
      const time = finiteTime(playhead, 'playhead');
      const latest = new Map();
      for (const record of sorted) {
        if (Date.parse(record.observedAt) > time) break;
        latest.set(record.entityKey, record);
      }
      return [...latest.values()].map((record) => ({ record, state: 'OBSERVED' }));
    },
    bounds() {
      return sorted.length ? { start: sorted[0].observedAt, end: sorted.at(-1).observedAt } : null;
    },
  };
}
