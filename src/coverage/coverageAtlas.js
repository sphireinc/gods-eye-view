const LEVELS = Object.freeze(['STRONG', 'MIXED', 'WEAK', 'MISSING']);

function levelFor({ sourceCount, freshestAgeMs, precisionM, provenancePct }) {
  if (!sourceCount && !Number.isFinite(freshestAgeMs)) return 'MISSING';
  if (sourceCount >= 3 && freshestAgeMs <= 60 * 60 * 1000 && precisionM <= 1000 && provenancePct >= 0.8) return 'STRONG';
  if (sourceCount >= 1 && freshestAgeMs <= 24 * 60 * 60 * 1000) return 'MIXED';
  return 'WEAK';
}

export function aggregateCoverageCell(cellId, inputs = {}) {
  const sourceCount = Number(inputs.sourceCount || 0);
  const freshestAgeMs = Number.isFinite(inputs.freshestAgeMs) ? inputs.freshestAgeMs : Infinity;
  const precisionM = Number.isFinite(inputs.precisionM) ? Math.max(0, inputs.precisionM) : Infinity;
  const provenancePct = Math.min(1, Math.max(0, Number(inputs.provenancePct || 0)));
  const components = Object.freeze({
    sourceCount, freshestAgeMs, precisionM, provenancePct,
    cameraAvailability: inputs.cameraAvailability ?? 'UNKNOWN',
    humanitarianAvailability: inputs.humanitarianAvailability ?? 'UNKNOWN',
    internetMeasurement: inputs.internetMeasurement ?? 'UNKNOWN',
  });
  return Object.freeze({
    cellId: String(cellId), level: levelFor(components), components,
    interpretation: 'LOW PUBLIC COVERAGE DOES NOT MEAN LOW ACTIVITY OR SAFETY',
  });
}

export function createCoverageAtlas(cells = []) {
  const store = new Map(cells.map((cell) => [cell.cellId, cell]));
  return {
    upsert(cellId, inputs) { const cell = aggregateCoverageCell(cellId, inputs); store.set(cell.cellId, cell); return cell; },
    get(cellId) { return store.get(cellId) || null; },
    list({ level } = {}) { return [...store.values()].filter((cell) => !level || cell.level === level); },
    levels: LEVELS,
  };
}
