const EXPLANATIONS = Object.freeze({
  OBSERVED: 'A public source directly reported this observation at the stated time.',
  MODELED: 'This value was produced by a documented model or transformation; it is not a direct measurement.',
  INFERRED: 'This is an inference from available evidence and may change with new observations.',
  STALE: 'The last known observation is older than the source freshness window.',
  UNKNOWN: 'The application cannot establish the source state or freshness right now.',
  UNAVAILABLE: 'No usable observation was available from this source in the selected window.',
  FORECAST: 'This is a forward-looking estimate, not a record of what has already happened.',
  SOURCE_OUTAGE: 'The source did not answer; that is different from a quiet or empty place.',
  REPEATED_REPORTING: 'Several reports may repeat one original source and do not equal independent corroboration.',
  SPATIAL_PRECISION: 'The location is intentionally approximate; the marker does not represent an exact point.',
});

export function explainUncertainty({ status = 'UNKNOWN', confidence = null, observedAt = null, validUntil = null } = {}) {
  const normalized = String(status).toUpperCase();
  const text = EXPLANATIONS[normalized] || EXPLANATIONS.UNKNOWN;
  const details = [];
  if (observedAt && Number.isFinite(Date.parse(observedAt))) details.push(`Observed at ${new Date(observedAt).toISOString()}.`);
  if (validUntil && Number.isFinite(Date.parse(validUntil))) details.push(`Source validity window ends at ${new Date(validUntil).toISOString()}.`);
  if (confidence?.basis) details.push(`Confidence basis: ${confidence.basis}.`);
  return { status: EXPLANATIONS[normalized] ? normalized : 'UNKNOWN', label: normalized, text, details, confidenceBand: confidence?.band || 'NOT PROVIDED' };
}

export function buildSyntheticLesson() { return Object.freeze([{ state: 'SOURCE_OUTAGE', title: 'An empty map is not an all-clear', example: 'A provider stops responding.', correctReading: 'Show UNKNOWN and keep the limitation visible.' }, { state: 'REPEATED_REPORTING', title: 'More links are not always more sources', example: 'Five articles cite one wire report.', correctReading: 'Count independent publishers and keep the original link.' }]); }

export function buildUncertaintyLegend() {
  return Object.entries(EXPLANATIONS).map(([status, text]) => ({ status, text }));
}
