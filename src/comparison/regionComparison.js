export function compareRegions(regions = [], indicators = []) {
  if (!Array.isArray(regions) || !Array.isArray(indicators)) throw new TypeError('regions and indicators must be arrays');
  const rows = regions.map((region) => {
    const values = Object.fromEntries(indicators.map((indicator) => {
      const item = region.indicators?.[indicator.id];
      return [indicator.id, item == null ? { value: null, state: 'UNKNOWN', sourceIds: [] } : { value: item.value ?? null, state: item.state || 'OBSERVED', sourceIds: item.sourceIds || [] }];
    }));
    return { regionId: String(region.regionId), label: String(region.label || region.regionId), values, coverage: indicators.filter((indicator) => values[indicator.id].value != null).length / Math.max(1, indicators.length) };
  });
  return { indicators: indicators.map((indicator) => ({ ...indicator })), rows, caveats: ['Indicators may use different geographic granularity and reporting cadence.', 'Missing or stale data is shown as UNKNOWN, not as a low value.', 'Comparison is descriptive and does not establish causation or safety.'] };
}

export function rankComparableIndicator(comparison, indicatorId) {
  return comparison.rows
    .filter((row) => row.values[indicatorId]?.value != null)
    .sort((a, b) => Number(b.values[indicatorId].value) - Number(a.values[indicatorId].value));
}
