/**
 * Explainable correlation for public observations. It groups signals, never
 * identifies people, and preserves disagreement instead of manufacturing a
 * single authoritative narrative.
 */
function timeOf(record) { return Date.parse(record?.observedAt || record?.receivedAt); }

function pointOf(record) {
  const coordinates = record?.geometry?.coordinates;
  return Array.isArray(coordinates) && coordinates.length >= 2
    ? { lon: Number(coordinates[0]), lat: Number(coordinates[1]) }
    : null;
}

function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLon = (b.lon - a.lon) * radians;
  const lat1 = a.lat * radians;
  const lat2 = b.lat * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function summarize(records, { radiusKm, windowMs }) {
  const sources = [...new Set(records.map((record) => record.source?.id).filter(Boolean))];
  const times = records.map(timeOf).filter(Number.isFinite);
  const points = records.map(pointOf).filter(Boolean);
  const center = points.length ? {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lon: points.reduce((sum, point) => sum + point.lon, 0) / points.length,
  } : null;
  return {
    eventId: `event:${records.map((record) => record.observationId).sort().join('|')}`,
    observationIds: records.map((record) => record.observationId),
    sourceIds: sources,
    sourceCount: sources.length,
    observationCount: records.length,
    center,
    timeStart: new Date(Math.min(...times)).toISOString(),
    timeEnd: new Date(Math.max(...times)).toISOString(),
    durationMs: Math.max(...times) - Math.min(...times),
    radiusKm,
    windowMs,
    agreement: sources.length > 1 ? 'MULTI-SOURCE' : 'SINGLE-SOURCE',
    caveat: sources.length > 1
      ? 'Sources overlap in time and space; this is correlation, not proof of causation.'
      : 'Only one source overlaps this cluster; seek corroboration before drawing conclusions.',
  };
}

/** Correlate observations with a deterministic connected-components pass. */
export function correlateObservations(records, { radiusKm = 25, windowMs = 30 * 60 * 1000 } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (!(radiusKm > 0) || !(windowMs >= 0)) throw new RangeError('correlation thresholds must be positive');
  const usable = records.filter((record) => Number.isFinite(timeOf(record)));
  const groups = [];
  for (const record of usable) {
    const time = timeOf(record);
    const point = pointOf(record);
    const group = groups.find((candidate) => candidate.some((item) => {
      return Math.abs(time - timeOf(item)) <= windowMs && distanceKm(point, pointOf(item)) <= radiusKm;
    }));
    if (group) group.push(record);
    else groups.push([record]);
  }
  return groups.map((group) => summarize(group, { radiusKm, windowMs }));
}
