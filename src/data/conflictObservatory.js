const STATES = new Set(['WATCH', 'CHANGING', 'ESTABLISHED', 'UNCERTAIN']);
const DISALLOWED_FIELDS = new Set(['target', 'targetId', 'weapon', 'strike', 'actorIntent', 'unitPosition', 'routeRecommendation']);

function required(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

/** Normalize a coarse, public evidence item without tactical affordances. */
export function normalizeConflictEvidence(input, { precision = 'coarse' } = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('evidence is required');
  for (const field of DISALLOWED_FIELDS) if (field in input) throw new Error(`disallowed conflict field: ${field}`);
  const sourceId = required(input.sourceId || input.source?.id, 'sourceId');
  const regionId = required(input.regionId, 'regionId');
  const kind = required(input.kind, 'kind');
  const evidence = {
    observationId: required(input.observationId, 'observationId'),
    entityType: 'conflict-evidence', regionId, kind, sourceId,
    observedAt: required(input.observedAt, 'observedAt'),
    publishedAt: input.publishedAt || null,
    status: input.status || 'REPORTED',
    sourceUrl: input.sourceUrl || null,
    attribution: input.attribution || sourceId,
    precision,
    humanitarian: input.humanitarian ? { ...input.humanitarian } : null,
    geometry: precision === 'coarse' && input.geometry?.type === 'Point'
      ? { type: 'Point', coordinates: input.geometry.coordinates.map((value) => Number(value.toFixed(1))) }
      : input.geometry || null,
    caveats: Array.isArray(input.caveats) ? input.caveats.map(String) : [],
  };
  return Object.freeze(evidence);
}

export function assessConflictRegion(evidence, { baselineCount = null, windowMs = 30 * 24 * 60 * 60 * 1000 } = {}) {
  if (!Array.isArray(evidence)) throw new TypeError('evidence must be an array');
  const normalized = evidence.map((item) => normalizeConflictEvidence(item));
  const sourceIds = [...new Set(normalized.map((item) => item.sourceId))];
  const byKind = new Map();
  normalized.forEach((item) => byKind.set(item.kind, (byKind.get(item.kind) || 0) + 1));
  const latest = normalized.reduce((max, item) => Math.max(max, Date.parse(item.observedAt)), 0);
  const earliest = latest - windowMs;
  const recent = normalized.filter((item) => Date.parse(item.observedAt) >= earliest);
  const indicators = [
    { id: 'event-activity', value: recent.length, baseline: baselineCount, sourceIds },
    { id: 'source-diversity', value: sourceIds.length, baseline: null, sourceIds },
    { id: 'evidence-types', value: byKind.size, baseline: null, sourceIds },
  ];
  const state = sourceIds.length < 2 ? 'UNCERTAIN' : recent.length >= 5 ? 'CHANGING' : 'WATCH';
  return Object.freeze({
    regionId: normalized[0]?.regionId || null,
    window: { from: new Date(earliest).toISOString(), to: new Date(latest || Date.now()).toISOString() },
    indicators, state: STATES.has(state) ? state : 'UNCERTAIN',
    evidence: normalized,
    limitations: [
      'This is a public-evidence summary, not a battlefield or emergency system.',
      baselineCount == null ? 'No historical baseline was supplied.' : null,
      sourceIds.length < 2 ? 'Evidence is not independently corroborated.' : null,
    ].filter(Boolean),
  });
}
