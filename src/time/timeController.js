/** Deterministic clock and replay cursor for recorded public observations. */
export const TIME_MODES = Object.freeze({
  LIVE: 'LIVE',
  PAUSED_LIVE: 'PAUSED_LIVE',
  REPLAY: 'REPLAY',
  RETURNING_TO_LIVE: 'RETURNING_TO_LIVE',
});

export const REPLAY_STATES = Object.freeze({
  OBSERVED: 'OBSERVED',
  INTERPOLATED: 'INTERPOLATED',
  UNAVAILABLE: 'UNAVAILABLE',
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
 * returned as unavailable; no current/live record is substituted. Optional
 * interpolation is deliberately bounded by `maxGapMs` and only applies to
 * records carrying a numeric `position`.
 */
export function createReplayCursor(records = [], {
  interpolate = false,
  maxGapMs = 15 * 60 * 1000,
  layerPolicies = {},
} = {}) {
  if (!Number.isFinite(maxGapMs) || maxGapMs < 0) throw new RangeError('maxGapMs must be non-negative');
  const sorted = [...records]
    .filter((record) => record?.entityKey && Number.isFinite(Date.parse(record?.observedAt)))
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const keys = [...new Set(sorted.map((record) => String(record.entityKey)))];
  const byKey = new Map();
  for (const record of sorted) {
    const key = String(record.entityKey);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(record);
  }

  const numericPosition = (value) => (
    Array.isArray(value) && value.length >= 2 && value.every((part) => Number.isFinite(Number(part)))
      ? value.map(Number)
      : value && typeof value === 'object' && Number.isFinite(Number(value.lon))
        && Number.isFinite(Number(value.lat))
        ? { lon: Number(value.lon), lat: Number(value.lat), ...(Number.isFinite(Number(value.height)) ? { height: Number(value.height) } : {}) }
        : null
  );
  const interpolatePosition = (a, b, ratio) => {
    const first = numericPosition(a);
    const second = numericPosition(b);
    if (!first || !second || Array.isArray(first) !== Array.isArray(second)) return null;
    if (Array.isArray(first)) return first.map((value, index) => value + (second[index] - value) * ratio);
    return {
      lon: first.lon + (second.lon - first.lon) * ratio,
      lat: first.lat + (second.lat - first.lat) * ratio,
      ...(Number.isFinite(first.height) && Number.isFinite(second.height)
        ? { height: first.height + (second.height - first.height) * ratio }
        : {}),
    };
  };

  const atKey = (key, time) => {
    const recordsForKey = byKey.get(key) || [];
    let previous = null;
    let next = null;
    for (const record of recordsForKey) {
      const timestamp = Date.parse(record.observedAt);
      if (timestamp <= time) previous = record;
      else {
        next = record;
        break;
      }
    }
    const policy = layerPolicies[key] || layerPolicies[previous?.layerId] || layerPolicies[next?.layerId];
    if (policy === 'unavailable') {
      return { entityKey: key, state: REPLAY_STATES.UNAVAILABLE, reason: 'LAYER_OPTOUT' };
    }
    if (!previous) return { entityKey: key, state: REPLAY_STATES.UNAVAILABLE, reason: 'NO_OBSERVATION_AT_PLAYHEAD' };
    if (
      interpolate && next
      && time - Date.parse(previous.observedAt) <= maxGapMs
      && Date.parse(next.observedAt) - time <= maxGapMs
    ) {
      const start = Date.parse(previous.observedAt);
      const end = Date.parse(next.observedAt);
      const position = interpolatePosition(previous.position, next.position, (time - start) / (end - start));
      if (position) {
        return {
          entityKey: key,
          layerId: previous.layerId || next.layerId || null,
          state: REPLAY_STATES.INTERPOLATED,
          record: { ...previous, position, observedAt: new Date(time).toISOString() },
          sourceRecords: [previous, next],
        };
      }
    }
    return {
      entityKey: key,
      layerId: previous.layerId || null,
      state: REPLAY_STATES.OBSERVED,
      record: previous,
    };
  };
  return {
    at(playhead) {
      const time = finiteTime(playhead, 'playhead');
      return keys.map((key) => atKey(key, time));
    },
    bounds() {
      return sorted.length ? { start: sorted[0].observedAt, end: sorted.at(-1).observedAt } : null;
    },
  };
}

/**
 * Collect a bounded, portable recording without retaining provider payloads.
 * Records are copied at the boundary and oldest entries are evicted by both
 * count and encoded byte size.
 */
export function createObservationRecorder({ maxRecords = 5000, maxBytes = 2_000_000 } = {}) {
  if (!Number.isInteger(maxRecords) || maxRecords < 1) throw new RangeError('maxRecords must be positive');
  if (!Number.isInteger(maxBytes) || maxBytes < 256) throw new RangeError('maxBytes is too small');
  const records = [];
  const encode = (archive) => JSON.stringify(archive);
  const size = () => new TextEncoder().encode(encode({ formatVersion: 1, records })).byteLength;
  const trim = () => {
    while (records.length > maxRecords || size() > maxBytes) records.shift();
  };
  return {
    record(record) {
      if (!record?.entityKey || !Number.isFinite(Date.parse(record.observedAt))) return false;
      records.push(JSON.parse(JSON.stringify(record)));
      trim();
      return true;
    },
    append(values) {
      if (!Array.isArray(values)) throw new TypeError('record batch must be an array');
      return values.reduce((count, record) => count + (this.record(record) ? 1 : 0), 0);
    },
    snapshot() {
      return Object.freeze({ formatVersion: 1, records: JSON.parse(JSON.stringify(records)) });
    },
    exportJson() {
      return encode(this.snapshot());
    },
    get size() { return records.length; },
  };
}
