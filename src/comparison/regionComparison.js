export function compareRegions(regions = [], indicators = []) {
  if (!Array.isArray(regions) || !Array.isArray(indicators)) throw new TypeError('regions and indicators must be arrays');
  const normalizedIndicators = indicators.map((indicator) => ({ ...indicator, unit: String(indicator.unit || 'unreported'), timeBasis: String(indicator.timeBasis || 'source-reported'), missing: String(indicator.missing || 'UNKNOWN') }));
  const rows = regions.map((region) => {
    const values = Object.fromEntries(normalizedIndicators.map((indicator) => {
      const item = region.indicators?.[indicator.id];
      return [indicator.id, item == null ? { value: null, state: indicator.missing, sourceIds: [] } : { value: item.value ?? null, state: item.state || 'OBSERVED', sourceIds: item.sourceIds || [], normalized: item.normalized === true }];
    }));
    return { regionId: String(region.regionId), label: String(region.label || region.regionId), values, coverage: normalizedIndicators.filter((indicator) => values[indicator.id].value != null).length / Math.max(1, normalizedIndicators.length) };
  });
  return { indicators: normalizedIndicators, rows, caveats: ['Indicators may use different geographic granularity and reporting cadence.', 'Missing or stale data is shown as UNKNOWN, not as a low value.', 'Raw counts are not comparable across unequal coverage unless normalized.', 'Comparison is descriptive and does not establish causation or safety.'] };
}

export function rankComparableIndicator(comparison, indicatorId) {
  return comparison.rows
    .filter((row) => row.values[indicatorId]?.value != null)
    .sort((a, b) => Number(b.values[indicatorId].value) - Number(a.values[indicatorId].value) || a.regionId.localeCompare(b.regionId));
}
