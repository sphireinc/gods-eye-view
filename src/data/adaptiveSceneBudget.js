/**
 * Deterministic scene allocation. It protects selected/contextual items,
 * gives each source a fair floor, and spends remaining capacity on items with
 * the best educational value instead of relying on insertion order.
 */
export function allocateSceneBudget(entries, {
  budget = 500,
  selectedIds = new Set(),
  sourceFloors = {},
  score = defaultSceneScore,
} = {}) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  if (!Number.isInteger(budget) || budget < 0) throw new RangeError('budget must be a non-negative integer');
  const protectedEntries = entries.filter((entry) => selectedIds.has(entry.id) || entry.protected === true);
  const eligible = entries.filter((entry) => !protectedEntries.includes(entry));
  const visible = [...new Map(protectedEntries.map((entry) => [entry.id, entry])).values()];
  const bySource = new Map();
  for (const entry of eligible) {
    const source = String(entry.source || 'unknown');
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push(entry);
  }
  for (const [source, floor] of Object.entries(sourceFloors)) {
    const candidates = (bySource.get(source) || []).sort(compareEntries(score));
    visible.push(...candidates.slice(0, Math.max(0, floor)));
  }
  const used = new Set(visible.map((entry) => entry.id));
  const remaining = eligible
    .filter((entry) => !used.has(entry.id))
    .sort(compareEntries(score));
  const room = Math.max(0, budget - visible.length);
  visible.push(...remaining.slice(0, room));
  const visibleIds = new Set(visible.map((entry) => entry.id));
  return {
    visible,
    hidden: entries.filter((entry) => !visibleIds.has(entry.id)),
    budget,
    protectedCount: protectedEntries.length,
    sourceCounts: Object.fromEntries([...new Set(visible.map((entry) => entry.source || 'unknown'))]
      .map((source) => [source, visible.filter((entry) => (entry.source || 'unknown') === source).length])),
  };
}

export function defaultSceneScore(entry) {
  return Number(entry.priority ?? 0)
    + (entry.selected ? 10_000 : 0)
    + (entry.nearby ? 100 : 0)
    + (entry.fresh ? 10 : 0);
}

function compareEntries(score) {
  return (a, b) => (Number(score(b)) - Number(score(a))) || String(a.id).localeCompare(String(b.id));
}
