/** Compare two observation snapshots without interpreting missing data as removal. */
export function compareObservationWindows(before = [], after = [], { identity = (record) => record.entityKey || record.observationId } = {}) {
  if (!Array.isArray(before) || !Array.isArray(after)) throw new TypeError('observation windows must be arrays');
  const previous = new Map(before.map((record) => [identity(record), record]));
  const current = new Map(after.map((record) => [identity(record), record]));
  const added = [];
  const changed = [];
  const unchanged = [];
  for (const [key, record] of current) {
    if (!previous.has(key)) added.push(record);
    else if (JSON.stringify(previous.get(key).properties || previous.get(key)) !== JSON.stringify(record.properties || record)) changed.push({ before: previous.get(key), after: record });
    else unchanged.push(record);
  }
  const removed = [...previous.entries()]
    .filter(([key]) => !current.has(key))
    .map(([key, record]) => ({ ...record, changeState: 'NOT_OBSERVED_IN_COMPARISON_WINDOW', identity: key }));
  return { added, changed, unchanged, removed, caveats: ['A record absent from the later window was not necessarily absent from the world.', 'Provider outages, coverage changes, and retention limits can create apparent differences.'] };
}

export function summarizeChanges(comparison) {
  return {
    added: comparison.added.length,
    changed: comparison.changed.length,
    unchanged: comparison.unchanged.length,
    notObservedLater: comparison.removed.length,
    interpretation: comparison.removed.length ? 'PARTIAL_COVERAGE' : 'OBSERVED_CHANGE_ONLY',
  };
}
