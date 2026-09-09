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
