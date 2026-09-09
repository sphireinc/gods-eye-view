const PROVIDERS = new Set(['KARTAVIEW', 'MAPILLARY', 'LOCAL_PUBLIC']);

export function normalizeStreetSequence(sequence) {
  if (!sequence?.id || !PROVIDERS.has(String(sequence.provider).toUpperCase())) throw new TypeError('street sequence id and supported provider are required');
  if (!sequence.sourcePage || !sequence.attribution) throw new TypeError('street sequence source page and attribution are required');
  const frames = (Array.isArray(sequence.frames) ? sequence.frames : []).filter((frame) => Number.isFinite(Date.parse(frame.capturedAt))).sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt)).map((frame) => Object.freeze({ id: String(frame.id), capturedAt: new Date(frame.capturedAt).toISOString(), latitude: Number(frame.latitude), longitude: Number(frame.longitude), url: String(frame.url), privacyMasked: frame.privacyMasked === true }));
  return Object.freeze({ id: String(sequence.id), provider: String(sequence.provider).toUpperCase(), roadLabel: String(sequence.roadLabel || 'Unnamed road'), sourcePage: String(sequence.sourcePage), attribution: String(sequence.attribution), license: sequence.license || null, frames });
}

export function compareStreetFrames(sequence, { before = null, after = null } = {}) {
  const normalized = normalizeStreetSequence(sequence);
  const frameAt = (value) => normalized.frames.find((frame) => frame.id === value) || null;
  const left = frameAt(before); const right = frameAt(after);
  return { sequenceId: normalized.id, before: left, after: right, state: left && right ? 'SIDE_BY_SIDE_CAPTURED' : 'SPARSE_OR_MISSING', caveat: 'Frames are discrete public captures; the feature does not imply continuous observation or interpolate people/objects.' };
}
