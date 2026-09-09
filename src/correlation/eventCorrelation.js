/**
 * Deterministic, public-data correlation primitives. A correlation is a
 * bounded description of co-occurrence, never an intelligence judgment.
 */

export const CORRELATION_VERSION = 1;
export const FORBIDDEN_ENTITY_TYPES = Object.freeze(new Set(['person', 'individual', 'private-person']));

function timeOf(record) {
  return Date.parse(record?.observedAt || record?.receivedAt || '');
}

function pointOf(record) {
  const coordinates = record?.geometry?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { lon, lat };
  }
  const position = record?.position;
  if (position && typeof position === 'object') {
    const lon = Number(position.lon ?? position.longitude);
    const lat = Number(position.lat ?? position.latitude);
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { lon, lat };
  }
  return null;
}

function sourceIdOf(record) {
  return String(record?.source?.id || record?.sourceId || record?.source || 'unknown');
}

function observationIdOf(record) {
  return String(record?.observationId || record?.id || '');
}

function identityFor(record) {
  return String(record?.entityId || record?.entityKey || record?.properties?.entityId || '');
}

function normalizeLongitude(value) {
  let longitude = Number(value);
  while (longitude > 180) longitude -= 360;
  while (longitude < -180) longitude += 360;
  return longitude;
}

/** Haversine distance with normalized longitudes, robust across the dateline. */
export function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const radians = Math.PI / 180;
  const dLat = (Number(b.lat) - Number(a.lat)) * radians;
  const dLon = (normalizeLongitude(b.lon) - normalizeLongitude(a.lon)) * radians;
  const lat1 = Number(a.lat) * radians;
  const lat2 = Number(b.lat) * radians;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function headingDelta(a, b) {
  const first = Number(a?.heading ?? a?.course);
  const second = Number(b?.heading ?? b?.course);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  const delta = Math.abs(((first - second + 540) % 360) - 180);
  return Math.min(delta, 360 - delta);
}

function sharedIdentifier(a, b) {
  const left = new Set([
    ...(Array.isArray(a?.routeIds) ? a.routeIds : []),
    ...(Array.isArray(a?.locationIds) ? a.locationIds : []),
    ...(a?.routeId ? [a.routeId] : []),
    ...(a?.locationId ? [a.locationId] : []),
  ].map(String));
  const right = [
    ...(Array.isArray(b?.routeIds) ? b.routeIds : []),
    ...(Array.isArray(b?.locationIds) ? b.locationIds : []),
    ...(b?.routeId ? [b.routeId] : []),
    ...(b?.locationId ? [b.locationId] : []),
  ].map(String);
  return right.find((value) => left.has(value)) || null;
}

export function normalizeEvidence(record, { asOf = Date.now() } = {}) {
  const observationId = observationIdOf(record);
  const observedAt = timeOf(record);
  const entityType = String(record?.entityType || record?.properties?.entityType || '').toLowerCase();
  if (!observationId || !Number.isFinite(observedAt)) return null;
  if (FORBIDDEN_ENTITY_TYPES.has(entityType)) return null;
  const point = pointOf(record);
  return Object.freeze({
    observationId,
    entityId: identityFor(record) || null,
    entityType: entityType || 'public-observation',
    sourceId: sourceIdOf(record),
    observedAt: new Date(observedAt).toISOString(),
    sourceAgeMs: Math.max(0, Number(asOf) - observedAt),
    geometry: point ? { type: 'Point', coordinates: [point.lon, point.lat] } : null,
    heading: Number.isFinite(Number(record.heading ?? record.course))
      ? Number(record.heading ?? record.course)
      : null,
    routeIds: [...new Set([
      ...(Array.isArray(record.routeIds) ? record.routeIds : []),
      ...(record.routeId ? [record.routeId] : []),
    ].map(String))],
    locationIds: [...new Set([
      ...(Array.isArray(record.locationIds) ? record.locationIds : []),
      ...(record.locationId ? [record.locationId] : []),
    ].map(String))],
    uncertainty: String(record.uncertainty || record.quality || 'UNSPECIFIED'),
    source: record.source || { id: sourceIdOf(record) },
  });
}

/** Return all mathematical reasons a pair may be grouped. */
export function explainPair(a, b, { radiusKm = 25, windowMs = 30 * 60 * 1000, headingToleranceDeg = 20 } = {}) {
  const leftTime = timeOf(a);
  const rightTime = timeOf(b);
  const distance = distanceKm(pointOf(a), pointOf(b));
  const temporalDistanceMs = Math.abs(leftTime - rightTime);
  const explanations = [];
  const factors = { distanceKm: distance, temporalDistanceMs };
  if (distance <= radiusKm) explanations.push(`within ${radiusKm} km (${distance.toFixed(2)} km)`);
  if (temporalDistanceMs <= windowMs) explanations.push(`within ${Math.round(windowMs / 60000)} minutes (${Math.round(temporalDistanceMs / 60000)} min)`);
  const heading = headingDelta(a, b);
  if (heading != null) {
    factors.headingDeltaDeg = heading;
    if (heading <= headingToleranceDeg) explanations.push(`heading differs by ${heading.toFixed(1)}°`);
  }
  const shared = sharedIdentifier(a, b);
  if (shared) {
    factors.sharedIdentifier = shared;
    explanations.push(`shares public identifier ${shared}`);
  }
  const sameSource = sourceIdOf(a) === sourceIdOf(b);
  factors.sameSource = sameSource;
  if (sameSource) explanations.push(`same source ${sourceIdOf(a)}`);
  const spatialTemporalMatch = distance <= radiusKm && temporalDistanceMs <= windowMs;
  const sharedTemporalMatch = Boolean(shared) && temporalDistanceMs <= windowMs;
  return {
    match: spatialTemporalMatch || sharedTemporalMatch,
    explanations,
    factors,
  };
}

function summarize(group, options, asOf) {
  const evidence = group.map((record) => normalizeEvidence(record, { asOf })).filter(Boolean);
  const sources = [...new Set(evidence.map((item) => item.sourceId))];
  const times = evidence.map((item) => Date.parse(item.observedAt));
  const points = evidence
    .map((item) => item.geometry?.coordinates)
    .filter(Boolean)
    .map(([lon, lat]) => ({ lon, lat }));
  const center = points.length ? {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lon: points.reduce((sum, point) => sum + point.lon, 0) / points.length,
  } : null;
  const explanations = [];
  for (let left = 0; left < group.length; left += 1) {
    for (let right = left + 1; right < group.length; right += 1) {
      const explanation = explainPair(group[left], group[right], options);
      if (explanation.match) explanations.push({
        between: [observationIdOf(group[left]), observationIdOf(group[right])],
        ...explanation,
      });
    }
  }
  return {
    eventId: `event:${evidence.map((record) => record.observationId).sort().join('|')}`,
    observationIds: evidence.map((record) => record.observationId),
    evidence,
    sourceIds: sources,
    sourceCount: sources.length,
    observationCount: evidence.length,
    center,
    timeStart: times.length ? new Date(Math.min(...times)).toISOString() : null,
    timeEnd: times.length ? new Date(Math.max(...times)).toISOString() : null,
    durationMs: times.length ? Math.max(...times) - Math.min(...times) : 0,
    radiusKm: options.radiusKm,
    windowMs: options.windowMs,
    explanations,
    agreement: sources.length > 1 ? 'MULTI-SOURCE' : 'SINGLE-SOURCE',
    caveat: sources.length > 1
      ? 'Sources overlap in time and space; this is correlation, not proof of causation.'
      : 'Only one source overlaps this cluster; seek corroboration before drawing conclusions.',
  };
}

/** Correlate public observations with a deterministic connected-components pass. */
export function correlateObservations(records, {
  radiusKm = 25,
  windowMs = 30 * 60 * 1000,
  asOf = Date.now(),
} = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (!(radiusKm > 0) || !(windowMs >= 0) || !Number.isFinite(asOf)) {
    throw new RangeError('correlation thresholds must be valid');
  }
  const usable = records
    .filter((record) => normalizeEvidence(record, { asOf }))
    .sort((a, b) => timeOf(a) - timeOf(b) || observationIdOf(a).localeCompare(observationIdOf(b)));
  const groups = [];
  for (const record of usable) {
    const group = groups.find((candidate) => candidate.some((item) => explainPair(item, record, { radiusKm, windowMs }).match));
    if (group) group.push(record);
    else groups.push([record]);
  }
  return groups.map((group) => summarize(group, { radiusKm, windowMs }, asOf));
}

export function createCorrelationWorkspace({
  id = `workspace:${Date.now()}`,
  title = 'Untitled public observation workspace',
  observations = [],
  area = null,
  timeWindow = null,
  notes = '',
  hypotheses = [],
  rules = { radiusKm: 25, windowMs: 30 * 60 * 1000 },
} = {}) {
  const evidence = observations.map((record) => normalizeEvidence(record)).filter(Boolean);
  const now = new Date().toISOString();
  return {
    formatVersion: CORRELATION_VERSION,
    id: String(id),
    title: String(title),
    area,
    timeWindow,
    evidence,
    hypotheses: hypotheses.map((hypothesis) => ({ ...hypothesis })),
    notes: String(notes),
    rules: { ...rules },
    createdAt: now,
    updatedAt: now,
    limitations: [
      'A correlation indicates co-occurrence in the selected public data; it does not establish causation, intent, or identity.',
      'Missing, delayed, or disputed sources can change the result.',
    ],
  };
}

export function addEvidence(workspace, observations) {
  if (!workspace || !Array.isArray(workspace.evidence)) throw new TypeError('invalid workspace');
  const incoming = (Array.isArray(observations) ? observations : [observations])
    .map((record) => normalizeEvidence(record)).filter(Boolean);
  const byId = new Map(workspace.evidence.map((item) => [item.observationId, item]));
  for (const item of incoming) byId.set(item.observationId, item);
  return {
    ...workspace,
    evidence: [...byId.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt)),
    updatedAt: new Date().toISOString(),
  };
}

export function correlateWorkspace(workspace) {
  const groups = correlateObservations(workspace.evidence, workspace.rules);
  return { ...workspace, correlations: groups, updatedAt: new Date().toISOString() };
}

export function exportWorkspaceJson(workspace) {
  return JSON.stringify(correlateWorkspace(workspace), null, 2);
}

export function exportWorkspaceMarkdown(workspace) {
  const result = correlateWorkspace(workspace);
  const lines = [
    `# ${result.title}`,
    '',
    `Workspace: \`${result.id}\``,
    `Updated: ${result.updatedAt} UTC`,
    '',
    '## Evidence',
    '',
    '| Observation | Source | Observed (UTC) | Age (ms) | Uncertainty |',
    '| --- | --- | --- | ---: | --- |',
    ...result.evidence.map((item) => `| ${item.observationId} | ${item.sourceId} | ${item.observedAt} | ${item.sourceAgeMs} | ${item.uncertainty} |`),
    '',
    '## Correlations',
    '',
    ...result.correlations.map((event) => [
      `### ${event.eventId}`,
      '',
      `- Sources: ${event.sourceIds.join(', ')}`,
      `- Window: ${event.timeStart || 'unknown'} to ${event.timeEnd || 'unknown'}`,
      `- Agreement: ${event.agreement}`,
      `- Caveat: ${event.caveat}`,
      ...event.explanations.flatMap((item) => item.explanations.map((reason) => `- Explanation: ${reason}`)),
      '',
    ].join('\n')),
    '## Limitations',
    '',
    ...result.limitations.map((limitation) => `- ${limitation}`),
  ];
  return lines.join('\n');
}

/** Small IndexedDB repository; callers can inject an implementation in tests. */
export function createWorkspaceRepository({ indexedDBImpl = globalThis.indexedDB, dbName = 'gods-eye-view', storeName = 'correlation-workspaces' } = {}) {
  if (!indexedDBImpl) throw new Error('IndexedDB is unavailable');
  const open = () => new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = async (mode, action) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = action(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  };
  return {
    save(workspace) { return transaction('readwrite', (store) => store.put(workspace)); },
    load(id) { return transaction('readonly', (store) => store.get(id)); },
    remove(id) { return transaction('readwrite', (store) => store.delete(id)); },
  };
}
