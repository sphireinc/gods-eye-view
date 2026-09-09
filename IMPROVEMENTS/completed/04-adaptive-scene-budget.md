# Adaptive Scene Budget and Global Level-of-Detail Planner

## Feature

Add a centralized scene-budget planner that allocates a frame-time and memory
budget across all visible layers based on camera altitude, viewport area,
interaction state, and measured performance. It should make dense combinations
such as infrastructure, traffic, vessels, labels, and detections usable without
requiring every layer to invent its own cap.

## Why it is valuable

The current render governor correctly prevents unnecessary continuous rendering,
and individual layers already have caps, LOD rules, clustering, and allocation
tests. The remaining problem is global competition: turning on many honest
layers can still overwhelm a laptop because each layer optimizes locally. The
current state explicitly notes that bundled infrastructure is too dense for a
first-run mission. A shared planner would make that mode viable and make the
performance contract easier to reason about.

## Implementation

Create `src/performance/sceneBudget.js` with a frame sampler that tracks rolling
CPU frame time, GPU timing when available, entity counts, draw-call proxies,
and memory-pressure signals. Add a declarative layer budget descriptor:
`priority`, `minimumVisibleCount`, `maxVisibleCount`, `costEstimate`, `supportsLOD`,
`supportsClustering`, and `degradationSteps`. The planner emits a read-only
allocation to each layer; it never mutates layer state or quietly disables a
user-selected source.

Define degradation steps such as full geometry, simplified geometry, clustered
points, labels off, distant entities off, and paused refresh. Preserve a minimum
honest representation and expose the active step in the layer row as
`DECLUTTERED`, `REDUCED`, or `PAUSED BY PERFORMANCE`. Tracked entities, active
selection, and explicit cockpit subjects receive reserved budget and must not
disappear because of a global cap.

Integrate with `renderGovernor.js`, `labelArbiter.js`, `focusAllocations.js`,
traffic's per-road budget, AIS caps, and infrastructure loaders. At global scale,
use a coarse spatial index and tile-level summaries; load detailed entities only
inside the camera's priority cone and a small prefetch ring. The planner should
adapt slowly with hysteresis so panning does not cause visible oscillation.

Add a diagnostics popover showing frame time, active budget, per-layer cost,
visible count, and the reason for each reduction. Include a “quality lock” for
recording and a “performance first” mode for weak devices. Quality lock should
warn when the chosen target cannot be maintained instead of lying about capture
quality.

## Tests and rollout

Use deterministic synthetic layer descriptors to test fairness, priority,
hysteresis, minimum guarantees, and tracked-subject reservation. Extend
`qa-perf` to assert no new per-frame loop bypasses the governor. Capture a
baseline on Node 24 and representative browsers, but treat browser GPU results
as environment evidence rather than a universal threshold.

## Definition of done

The infrastructure combination can be enabled without freezing the scene, every
degradation is visible and reversible, tracked subjects remain present, and the
diagnostics view explains which budget decision is active. Existing allocation
tests remain green and no layer is allowed to silently turn a source into an
empty green state.

## Implemented surfaces

- `src/performance/sceneBudget.js` provides bounded frame sampling, global
  allocation, stable priority ordering, selected-subject reservations,
  degradation steps, quality lock, performance-first mode, and read-only
  diagnostics.
- `DataLayerManager` accepts the planner and publishes allocations without
  changing layer visibility. Layers may opt into `applySceneBudget`; all other
  layers retain their source and remain responsible for their own rendering.
- The main application installs the planner after the complete layer registry
  is sealed and exposes a diagnostics panel with frame time, available units,
  per-layer allocation, and the reason for each reduction.
- Planner tests cover fairness, reservations, degradation behavior, bounded
  samples, and quality lock.
