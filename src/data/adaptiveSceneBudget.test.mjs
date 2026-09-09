import assert from 'node:assert/strict';
import test from 'node:test';
import { allocateSceneBudget } from './adaptiveSceneBudget.js';

const entry = (id, source, priority = 0, extra = {}) => ({ id, source, priority, ...extra });

test('protects selected entries and fills a fair source floor before ranking surplus', () => {
  const result = allocateSceneBudget([
    entry('flight-a', 'flights', 1),
    entry('flight-b', 'flights', 100),
    entry('quake-a', 'earthquakes', 1),
    entry('quake-b', 'earthquakes', 90),
    entry('selected', 'cctv', 0),
  ], { budget: 3, selectedIds: new Set(['selected']), sourceFloors: { flights: 1, earthquakes: 1 } });
  assert.deepEqual(result.visible.map((item) => item.id), ['selected', 'flight-b', 'quake-b']);
  assert.equal(result.hidden.length, 2);
});

test('tie ordering is stable and protected overflow remains visible', () => {
  const result = allocateSceneBudget([
    entry('b', 'one'),
    entry('a', 'one'),
    entry('protected', 'two', 0, { protected: true }),
  ], { budget: 2 });
  assert.deepEqual(result.visible.map((item) => item.id), ['protected', 'a']);
  assert.equal(result.protectedCount, 1);
});

test('rejects invalid budgets instead of silently degrading the scene', () => {
  assert.throws(() => allocateSceneBudget([], { budget: 1.5 }), /non-negative integer/);
});
