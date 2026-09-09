import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlertEngine, validateAlertRule } from './rules.js';

test('validates declarative public-data alert rules', () => {
  const rule = validateAlertRule({ id: 'large-quake', entityType: 'earthquake', field: 'properties.magnitude', operator: 'gte', value: 5 });
  assert.equal(rule.enabled, true);
  assert.throws(() => validateAlertRule({ id: 'bad', entityType: 'x', operator: 'delete' }), /unsupported/);
});

test('triggers matching rules and respects cooldowns', () => {
  let clock = 1_000;
  const engine = createAlertEngine({ now: () => clock, rules: [{ id: 'quake', entityType: 'earthquake', field: 'properties.magnitude', operator: 'gte', value: 5, cooldownMs: 100 } ] });
  const record = { entityType: 'earthquake', observationId: 'q1', properties: { magnitude: 5.2 } };
  assert.equal(engine.evaluate(record).length, 1);
  clock += 50;
  assert.equal(engine.evaluate(record).length, 0);
  clock += 51;
  assert.equal(engine.evaluate(record).length, 1);
});

test('does not evaluate a rule against a different entity type', () => {
  const engine = createAlertEngine({ rules: [{ id: 'quake', entityType: 'earthquake', field: 'properties.magnitude', operator: 'gte', value: 5 }] });
  assert.deepEqual(engine.evaluate({ entityType: 'fire', properties: { magnitude: 99 } }), []);
});
