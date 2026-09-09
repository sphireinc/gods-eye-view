const CATEGORIES = new Set(['transit', 'school', 'university', 'hospital', 'market', 'park', 'cultural-venue', 'library', 'sports', 'community-space', 'public-camera']);
const STATES = new Set(['STATIC', 'SCHEDULED', 'OBSERVED', 'INFERRED', 'STALE', 'UNKNOWN']);

export function validateEverydayContext(item) {
  if (!item?.id || !item.category || !CATEGORIES.has(item.category)) throw new TypeError('invalid everyday-world category');
  const latitude = Number(item.latitude); const longitude = Number(item.longitude); if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new TypeError('invalid everyday-world coordinates');
  return Object.freeze({ id: String(item.id), category: item.category, label: String(item.label || item.id), latitude, longitude, state: STATES.has(item.state) ? item.state : 'UNKNOWN', sourceId: String(item.sourceId || 'unknown'), sourceUrl: item.sourceUrl && /^https:\/\//i.test(item.sourceUrl) ? item.sourceUrl : null, sensitive: item.sensitive === true });
}

export function createContinuityPreset(items = []) {
  const normalized = [...new Map(items.filter((item) => item?.sensitive !== true).map(validateEverydayContext).map((item) => [item.id, item])).values()];
  return Object.freeze({ id: 'continuity', label: 'EVERYDAY CONTEXT', categories: [...new Set(normalized.map((item) => item.category))], items: Object.freeze(normalized), caveat: 'Civic context describes public places and services; it does not describe attendance or individual movement.' });
}

export function clusterContinuityItems(items = [], { cellDegrees = 1 } = {}) { const groups = new Map(); for (const item of items) { const key = `${Math.floor((item.latitude + 90) / cellDegrees)}:${Math.floor((item.longitude + 180) / cellDegrees)}`; const group = groups.get(key) || { latitude: 0, longitude: 0, count: 0, categories: new Set() }; group.latitude += item.latitude; group.longitude += item.longitude; group.count += 1; group.categories.add(item.category); groups.set(key, group); } return [...groups.values()].map((group) => ({ latitude: group.latitude / group.count, longitude: group.longitude / group.count, count: group.count, categories: [...group.categories].sort() })); }
