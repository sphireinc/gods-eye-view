import assert from 'node:assert/strict';
import test from 'node:test';
import { createSceneBudgetPlanner } from './sceneBudget.js';

const layers = [
  { id: 'flights', budgetDescriptor: { priority: 100, maxVisibleCount: 100, minimumVisibleCount: 2 } },
  { id: 'traffic', budgetDescriptor: { priority: 50, maxVisibleCount: 100, minimumVisibleCount: 1 } },
];

test('planner reserves selected subjects and emits reversible allocations', () => {
  const planner = createSceneBudgetPlanner({ targetFrameMs: 10 });
  const result = planner.plan(layers, { selectedIds: new Set(['traffic']) });
  assert.equal(result.allocations.traffic.reserved, true);
  assert.equal(result.allocations.traffic.step, 'FULL');
  assert.ok(result.allocations.flights.visibleCount >= 2);
});

test('planner degrades under sustained pressure and reports the reason', () => {
  const planner = createSceneBudgetPlanner({ targetFrameMs: 10 });
  planner.sampleFrame({ cpuMs: 30 });
  const reduced = planner.plan(layers);
  assert.notEqual(reduced.allocations.flights.step, 'FULL');
  assert.equal(reduced.allocations.flights.reason, 'FRAME_TIME_PRESSURE');
  planner.setQualityLock(true);
  const locked = planner.plan(layers);
  assert.equal(locked.qualityLock, true);
  assert.equal(locked.allocations.flights.step, 'FULL');
});

test('planner samples are bounded and diagnostics are read-only', () => {
  const planner = createSceneBudgetPlanner();
  for (let i = 0; i < 100; i += 1) planner.sampleFrame({ cpuMs: i });
  const diagnostics = planner.getDiagnostics();
  assert.equal(diagnostics.sampleCount, 60);
  assert.throws(() => { diagnostics.sampleCount = 0; }, TypeError);
});
