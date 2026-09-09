const DOMAINS = new Set(['natural-events', 'earth-observation', 'atmosphere', 'ocean', 'water', 'connectivity', 'news', 'humanitarian', 'infrastructure']);

export const PUBLIC_API_CATALOG = Object.freeze([
  { id: 'nasa-eonet', name: 'NASA EONET', domain: 'natural-events', access: 'public', auth: 'none', cadence: 'near-real-time', redistribution: 'review-required', safety: 'event context' },
  { id: 'nasa-gibs', name: 'NASA GIBS', domain: 'earth-observation', access: 'public', auth: 'none', cadence: 'product-dependent', redistribution: 'product-terms', safety: 'broad scene change' },
  { id: 'open-meteo', name: 'Open-Meteo', domain: 'atmosphere', access: 'public', auth: 'none', cadence: 'forecast', redistribution: 'non-commercial-default', safety: 'environmental context' },
  { id: 'openaq', name: 'OpenAQ', domain: 'atmosphere', access: 'public', auth: 'api-policy', cadence: 'station-dependent', redistribution: 'license-review', safety: 'station observations' },
  { id: 'ioda', name: 'IODA', domain: 'connectivity', access: 'public', auth: 'none', cadence: 'near-real-time', redistribution: 'terms-review', safety: 'aggregate connectivity only' },
  { id: 'reliefweb', name: 'ReliefWeb', domain: 'humanitarian', access: 'public', auth: 'app-name', cadence: 'report-dependent', redistribution: 'link-and-attribution', safety: 'civilian context' },
  { id: 'gdelt', name: 'GDELT', domain: 'news', access: 'public', auth: 'none', cadence: 'frequent', redistribution: 'link-and-attribution', safety: 'media context, not severity' },
  { id: 'ucdp', name: 'UCDP', domain: 'humanitarian', access: 'public', auth: 'terms-review', cadence: 'revision-dependent', redistribution: 'dataset-terms', safety: 'historical aggregate events' },
]);

export function getPublicApiCatalog({ domain, access } = {}) {
  return PUBLIC_API_CATALOG.filter((api) => (!domain || api.domain === domain) && (!access || api.access === access));
}

export function validatePublicApiSource(source) {
  if (!source?.id || !source.name || !DOMAINS.has(source.domain)) throw new TypeError('public API source requires id, name, and supported domain');
  if (!source.safety || !source.redistribution) throw new TypeError('public API source requires safety and redistribution metadata');
  return Object.freeze({ ...source, id: String(source.id), name: String(source.name) });
}
