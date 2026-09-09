const EXPLANATIONS = Object.freeze({
  OBSERVED: 'A public source directly reported this observation at the stated time.',
  MODELED: 'This value was produced by a documented model or transformation; it is not a direct measurement.',
  INFERRED: 'This is an inference from available evidence and may change with new observations.',
  STALE: 'The last known observation is older than the source freshness window.',
  UNKNOWN: 'The application cannot establish the source state or freshness right now.',
  UNAVAILABLE: 'No usable observation was available from this source in the selected window.',
});

export function explainUncertainty({ status = 'UNKNOWN', confidence = null, observedAt = null, validUntil = null } = {}) {
  const normalized = String(status).toUpperCase();
  const text = EXPLANATIONS[normalized] || EXPLANATIONS.UNKNOWN;
  const details = [];
  if (observedAt) details.push(`Observed at ${new Date(observedAt).toISOString()}.`);
  if (validUntil) details.push(`Source validity window ends at ${new Date(validUntil).toISOString()}.`);
  if (confidence?.basis) details.push(`Confidence basis: ${confidence.basis}.`);
  return { status: EXPLANATIONS[normalized] ? normalized : 'UNKNOWN', label: normalized, text, details, confidenceBand: confidence?.band || 'NOT PROVIDED' };
}

export function buildUncertaintyLegend() {
  return Object.entries(EXPLANATIONS).map(([status, text]) => ({ status, text }));
}
