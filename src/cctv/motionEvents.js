export function compareFrameSignatures(previous, current, { threshold = 0.12 } = {}) {
  if (!Array.isArray(previous) || !Array.isArray(current) || previous.length !== current.length || !previous.length) return { state: 'UNKNOWN', changedFraction: null, changed: false };
  let changed = 0;
  for (let index = 0; index < previous.length; index += 1) if (Math.abs(Number(previous[index]) - Number(current[index])) > threshold) changed += 1;
  const changedFraction = changed / previous.length;
  return { state: 'OBSERVED_FRAME_CHANGE', changedFraction, changed: changedFraction > 0, threshold, interpretation: 'Pixels changed; this does not identify people, objects, causes, or activity.' };
}

export function createMotionEvent(cameraId, comparison, { observedAt = new Date().toISOString() } = {}) {
  return Object.freeze({ id: `motion:${cameraId}:${observedAt}`, cameraId: String(cameraId), observedAt, kind: 'frame-change', state: comparison.state, changedFraction: comparison.changedFraction, confidence: comparison.state === 'OBSERVED_FRAME_CHANGE' ? 'LOW_TO_MEDIUM' : 'UNKNOWN', caveat: comparison.interpretation || 'No interpretation available.' });
}

export const REVIEWED_SCENE_EVENTS = Object.freeze(['ROADWAY_BUSY', 'WATER_LEVEL_CHANGED', 'SNOW_ACCUMULATION', 'VISIBILITY_REDUCED', 'FRAME_STATIC']);
const FORBIDDEN_OUTPUT = /face|person|body|plate|weapon|identity|track|object.?count/i;
export function sanitizeSceneEvent(event, { allowed = REVIEWED_SCENE_EVENTS, expiresInMs = 5 * 60 * 1000, now = Date.now() } = {}) {
  const kind = String(event?.kind || '').toUpperCase();
  if (FORBIDDEN_OUTPUT.test(JSON.stringify(event || {})) || !allowed.includes(kind)) return { ok: false, reason: 'UNSUPPORTED_OR_PRIVACY_SENSITIVE' };
  const observedAt = Date.parse(event?.observedAt || '');
  if (!Number.isFinite(observedAt)) return { ok: false, reason: 'INVALID_TIMESTAMP' };
  return { ok: true, value: Object.freeze({ cameraId: String(event.cameraId || ''), kind, observedAt: new Date(observedAt).toISOString(), expiresAt: new Date(Math.min(observedAt + expiresInMs, now + expiresInMs)).toISOString(), scoreBand: ['LOW', 'MEDIUM', 'HIGH'].includes(event.scoreBand) ? event.scoreBand : 'LOW', method: String(event.method || 'scene-level-rule'), sourceIds: Array.isArray(event.sourceIds) ? event.sourceIds.map(String).slice(0, 8) : [] }) };
}
