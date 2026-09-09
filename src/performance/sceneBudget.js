export const DEGRADATION_STEPS = Object.freeze([
  'FULL',
  'DECLUTTERED',
  'REDUCED',
  'PAUSED_BY_PERFORMANCE',
]);

const DEFAULT_DESCRIPTOR = Object.freeze({
  priority: 50,
  minimumVisibleCount: 0,
  maxVisibleCount: 500,
  costEstimate: 1,
  supportsLOD: true,
  supportsClustering: false,
  degradationSteps: ['DECLUTTERED', 'REDUCED', 'PAUSED_BY_PERFORMANCE'],
});

function number(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeDescriptor(layer) {
  const descriptor = { ...DEFAULT_DESCRIPTOR, ...(layer.budgetDescriptor || {}) };
  return {
    ...descriptor,
    id: String(layer.id),
    priority: number(descriptor.priority, DEFAULT_DESCRIPTOR.priority),
    minimumVisibleCount: Math.max(0, Math.floor(number(descriptor.minimumVisibleCount, 0))),
    maxVisibleCount: Math.max(0, Math.floor(number(descriptor.maxVisibleCount, 500))),
    costEstimate: Math.max(.01, number(descriptor.costEstimate, 1)),
    degradationSteps: [...new Set(descriptor.degradationSteps || DEFAULT_DESCRIPTOR.degradationSteps)]
      .filter((step) => DEGRADATION_STEPS.includes(step)),
  };
}

function freezeAllocation(allocation) {
  return Object.freeze({
    ...allocation,
    degradationSteps: Object.freeze([...allocation.degradationSteps]),
  });
}

/**
 * Global scene planner. It only emits allocations; layers remain responsible
 * for applying them, so no source can silently disappear from the data model.
 */
export function createSceneBudgetPlanner({ targetFrameMs = 16.7, hysteresisMs = 2 } = {}) {
  if (!(targetFrameMs > 0) || !(hysteresisMs >= 0)) throw new RangeError('invalid scene budget timing');
  let samples = [];
  let lastPlan = new Map();
  let qualityLock = false;
  let performanceFirst = false;

  const averageFrameMs = () => samples.length
    ? samples.reduce((sum, sample) => sum + sample.cpuMs, 0) / samples.length
    : targetFrameMs;

  const sampleFrame = ({ cpuMs, gpuMs = null, visibleEntities = 0, drawCalls = null, memoryMB = null } = {}) => {
    const sample = { cpuMs: number(cpuMs, targetFrameMs), gpuMs: Number.isFinite(gpuMs) ? gpuMs : null, visibleEntities, drawCalls, memoryMB };
    samples = [...samples.slice(-59), sample];
    return Object.freeze({ ...sample, averageCpuMs: averageFrameMs() });
  };

  const plan = (layers = [], {
    altitudeM = 1_000_000,
    viewportArea = 1,
    interaction = 'idle',
    selectedIds = new Set(),
  } = {}) => {
    const pressure = averageFrameMs() / targetFrameMs;
    const altitudeFactor = Math.min(2, Math.max(.5, Math.log10(Math.max(10, altitudeM)) / 6));
    const interactionFactor = interaction === 'dragging' ? .75 : interaction === 'tracking' ? 1.2 : 1;
    const available = Math.max(1, Math.floor(500 / Math.max(1, pressure * altitudeFactor * interactionFactor) * Math.max(.5, viewportArea)));
    const descriptors = layers.map(normalizeDescriptor);
    const allocations = new Map();
    let remaining = available;
    for (const descriptor of descriptors.filter((item) => selectedIds.has(item.id))) {
      allocations.set(descriptor.id, freezeAllocation({
        layerId: descriptor.id,
        step: 'FULL',
        visibleCount: descriptor.maxVisibleCount,
        reserved: true,
        reason: 'SELECTED_SUBJECT_RESERVED',
        budgetUnits: descriptor.maxVisibleCount * descriptor.costEstimate,
        degradationSteps: descriptor.degradationSteps,
      }));
      remaining -= descriptor.maxVisibleCount;
    }
    const ranked = descriptors.filter((item) => !selectedIds.has(item.id))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    for (const descriptor of ranked) {
      const floor = Math.min(descriptor.minimumVisibleCount, remaining);
      const desired = Math.min(descriptor.maxVisibleCount, Math.max(floor, Math.floor(remaining / Math.max(1, ranked.length))));
      const previous = lastPlan.get(descriptor.id);
      const overloaded = pressure > 1.1;
      const underloaded = pressure < .85;
      const previousStep = previous?.step || 'FULL';
      const shouldReduce = overloaded && previousStep === 'FULL';
      const shouldRestore = underloaded && previousStep !== 'FULL' && pressure < .85 - hysteresisMs / 100;
      const step = qualityLock || !descriptor.supportsLOD
        ? 'FULL'
        : shouldReduce
          ? (descriptor.degradationSteps[0] || 'FULL')
          : shouldRestore
            ? 'FULL'
            : previousStep;
      const multiplier = step === 'FULL' ? 1 : step === 'DECLUTTERED' ? .7 : step === 'REDUCED' ? .4 : 0;
      const visibleCount = Math.min(desired, Math.max(floor, Math.floor(desired * multiplier)));
      allocations.set(descriptor.id, freezeAllocation({
        layerId: descriptor.id,
        step,
        visibleCount,
        reserved: false,
        reason: step === 'FULL' ? 'WITHIN_GLOBAL_BUDGET' : performanceFirst ? 'PERFORMANCE_FIRST' : 'FRAME_TIME_PRESSURE',
        budgetUnits: visibleCount * descriptor.costEstimate,
        degradationSteps: descriptor.degradationSteps,
      }));
      remaining = Math.max(0, remaining - visibleCount);
    }
    lastPlan = allocations;
    const result = {
      targetFrameMs,
      averageCpuMs: averageFrameMs(),
      availableUnits: available,
      remainingUnits: remaining,
      qualityLock,
      performanceFirst,
      allocations: Object.fromEntries(allocations),
    };
    return Object.freeze(result);
  };

  return {
    sampleFrame,
    plan,
    getDiagnostics() {
      return Object.freeze({ averageCpuMs: averageFrameMs(), sampleCount: samples.length, targetFrameMs, qualityLock, performanceFirst });
    },
    setQualityLock(value) { qualityLock = value === true; return qualityLock; },
    setPerformanceFirst(value) { performanceFirst = value === true; return performanceFirst; },
  };
}
