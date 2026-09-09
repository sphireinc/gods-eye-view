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
  { id: 'copernicus-marine', name: 'Copernicus Marine', domain: 'ocean', access: 'public', auth: 'account-or-token', cadence: 'forecast-and-reanalysis', redistribution: 'terms-review', safety: 'environmental context' },
  { id: 'usgs-water', name: 'USGS Water Data', domain: 'water', access: 'public', auth: 'none', cadence: 'station-dependent', redistribution: 'public-data-policy', safety: 'gauge observations' },
  { id: 'nws', name: 'National Weather Service', domain: 'atmosphere', access: 'public', auth: 'user-agent', cadence: 'near-real-time', redistribution: 'public-data-policy', safety: 'weather and alert context' },
  { id: 'ripe-stat', name: 'RIPEstat', domain: 'connectivity', access: 'public', auth: 'none', cadence: 'near-real-time', redistribution: 'terms-review', safety: 'aggregate routing context' },
  { id: 'global-energy-monitor', name: 'Global Energy Monitor', domain: 'infrastructure', access: 'public', auth: 'none', cadence: 'revision-dependent', redistribution: 'dataset-terms', safety: 'infrastructure context' },
  { id: 'gbif', name: 'GBIF', domain: 'natural-events', access: 'public', auth: 'none', cadence: 'observation-dependent', redistribution: 'record-license', safety: 'biodiversity observations' },
  { id: 'openalex', name: 'OpenAlex', domain: 'news', access: 'public', auth: 'none', cadence: 'revision-dependent', redistribution: 'open-data-terms', safety: 'research context' },
]);

export function getPublicApiCatalog({ domain, access } = {}) {
  return PUBLIC_API_CATALOG.filter((api) => (!domain || api.domain === domain) && (!access || api.access === access));
}

export function validatePublicApiSource(source) {
  if (!source?.id || !source.name || !DOMAINS.has(source.domain)) throw new TypeError('public API source requires id, name, and supported domain');
  if (!source.safety || !source.redistribution) throw new TypeError('public API source requires safety and redistribution metadata');
  if (!/^https:\/\//i.test(String(source.documentationUrl || ''))) throw new TypeError('public API source requires an HTTPS documentation URL');
  if (source.capabilities && (!Array.isArray(source.capabilities) || source.capabilities.some((capability) => typeof capability !== 'string'))) throw new TypeError('capabilities must be string labels');
  return Object.freeze({ ...source, id: String(source.id), name: String(source.name), capabilities: Object.freeze([...(source.capabilities || [])]) });
}
