export function buildWorldPulse({ generatedAt = new Date().toISOString(), regions = [], signals = [] } = {}) {
  const grouped = new Map();
  for (const signal of signals) {
    const regionId = String(signal.regionId || 'unknown');
    if (!grouped.has(regionId)) grouped.set(regionId, []);
    grouped.get(regionId).push({ id: String(signal.id || `${regionId}:${grouped.get(regionId).length}`), label: String(signal.label || 'Public signal'), state: signal.state || 'UNKNOWN', sourceIds: Array.isArray(signal.sourceIds) ? signal.sourceIds.map(String) : [], observedAt: signal.observedAt || null, explanation: String(signal.explanation || 'No explanation supplied') });
  }
  const cards = regions.map((region) => {
    const regionSignals = grouped.get(String(region.regionId)) || [];
    const sourceIds = [...new Set(regionSignals.flatMap((signal) => signal.sourceIds))];
    return { regionId: String(region.regionId), label: String(region.label || region.regionId), signalCount: regionSignals.length, sourceCount: sourceIds.length, signals: regionSignals, state: regionSignals.length ? (sourceIds.length > 1 ? 'CHANGING' : 'SINGLE-SOURCE') : 'NO_MATCHING_PUBLIC_SIGNAL' };
  });
  return Object.freeze({ schemaVersion: 1, generatedAt, cards, caveats: ['This digest reflects public-source visibility, not total world activity.', 'Media volume is context and is not a measure of severity or truth.', 'A region with no signal may be under-observed, delayed, or outside the selected sources.'] });
}

export function pulseToMarkdown(pulse) {
  const lines = [`# World pulse`, '', `Generated: ${pulse.generatedAt}`, ''];
  for (const card of pulse.cards) {
    lines.push(`## ${card.label}`, `State: ${card.state}`, `Signals: ${card.signalCount}; sources: ${card.sourceCount}`);
    for (const signal of card.signals) lines.push(`- ${signal.label}: ${signal.explanation} [${signal.state}]`);
    lines.push('');
  }
  lines.push('## Caveats', ...pulse.caveats.map((caveat) => `- ${caveat}`));
  return lines.join('\n');
}
