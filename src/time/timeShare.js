const VERSION = 'gev-time-1';

function timestamp(value, field) {
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be a valid timestamp`);
  return new Date(parsed).toISOString();
}

/** Encode only portable recording identity and bounded playback state. */
export function encodeTimeShareState({ recordingId, start, end, playhead } = {}) {
  if (!recordingId || !/^[A-Za-z0-9._:-]{1,160}$/.test(String(recordingId))) {
    throw new TypeError('recordingId is required and must be portable');
  }
  const normalizedStart = timestamp(start, 'start');
  const normalizedEnd = timestamp(end, 'end');
  const normalizedPlayhead = timestamp(playhead || normalizedStart, 'playhead');
  if (Date.parse(normalizedEnd) < Date.parse(normalizedStart)) throw new RangeError('end precedes start');
  if (Date.parse(normalizedPlayhead) < Date.parse(normalizedStart) || Date.parse(normalizedPlayhead) > Date.parse(normalizedEnd)) {
    throw new RangeError('playhead is outside the recording window');
  }
  const params = new URLSearchParams({
    timeVersion: VERSION,
    recordingId: String(recordingId),
    start: normalizedStart,
    end: normalizedEnd,
    playhead: normalizedPlayhead,
  });
  return `?${params}`;
}

/** Parse and validate a time share state; arbitrary URLs and unbounded ranges are rejected. */
export function decodeTimeShareState(input) {
  const params = input instanceof URLSearchParams ? input : new URLSearchParams(String(input || '').replace(/^\?/, ''));
  if (params.get('timeVersion') !== VERSION) return null;
  try {
    return {
      version: VERSION,
      recordingId: params.get('recordingId'),
      start: timestamp(params.get('start'), 'start'),
      end: timestamp(params.get('end'), 'end'),
      playhead: timestamp(params.get('playhead'), 'playhead'),
    };
  } catch {
    return null;
  }
}

export const TIME_SHARE_VERSION = VERSION;
