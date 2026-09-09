const CATEGORIES = new Set(['transit', 'school', 'university', 'hospital', 'market', 'park', 'cultural-venue', 'library', 'sports', 'community-space', 'public-camera']);

export function validateEverydayContext(item) {
  if (!item?.id || !item.category || !CATEGORIES.has(item.category)) throw new TypeError('invalid everyday-world category');
  return Object.freeze({ id: String(item.id), category: item.category, label: String(item.label || item.id), latitude: Number(item.latitude), longitude: Number(item.longitude), state: item.state || 'STATIC', sourceId: String(item.sourceId || 'unknown'), sourceUrl: item.sourceUrl || null, sensitive: item.sensitive === true });
}

export function createContinuityPreset(items = []) {
  const normalized = items.map(validateEverydayContext).filter((item) => !item.sensitive);
  return Object.freeze({ id: 'continuity', label: 'EVERYDAY CONTEXT', categories: [...new Set(normalized.map((item) => item.category))], items: Object.freeze(normalized), caveat: 'Civic context describes public places and services; it does not describe attendance or individual movement.' });
}
