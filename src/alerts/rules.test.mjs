import assert from 'node:assert/strict';
import test from 'node:test';
import { ALERT_STATES, createAlertEngine, validateAlertRule } from './rules.js';

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

test('validates bounded predicates, antimeridian areas, and privacy restrictions', () => {
  const rule = validateAlertRule({ id: 'port-entry', name: 'Port entry', entityType: 'vessel', predicate: 'enter', area: { west: 170, south: -10, east: -170, north: 10 } });
  assert.equal(rule.predicate, 'enter');
  assert.throws(() => validateAlertRule({ id: 'face', entityType: 'person', predicate: 'appearance' }), /non-person/);
  assert.throws(() => validateAlertRule({ id: 'secret', entityType: 'vessel', predicate: 'change', field: 'properties.apiToken' }), /privacy/);
  assert.throws(() => validateAlertRule({ id: 'wide', entityType: 'vessel', predicate: 'enter', area: { west: -181, south: 0, east: 1, north: 2 } }), /bounded/);
});

test('source unavailability becomes UNKNOWN and never synthesizes an exit', () => {
  const engine = createAlertEngine({ rules: [{ id: 'fire', entityType: 'fire', predicate: 'appearance' }] });
  const record = { entityType: 'fire', observationId: 'f1' };
  assert.equal(engine.evaluate(record).length, 1);
  assert.deepEqual(engine.evaluate(record, { sourceAvailable: false }), []);
  assert.equal(engine.getState('fire'), ALERT_STATES.UNKNOWN);
});

test('change and disappearance events carry auditable before/after evidence', () => {
  let clock = 1000;
  const engine = createAlertEngine({ now: () => clock, rules: [
    { id: 'altitude', entityType: 'aircraft', predicate: 'change', field: 'properties.altitude' },
    { id: 'gone', entityType: 'aircraft', predicate: 'disappearance', field: 'properties.callsign' },
  ] });
  const before = { entityType: 'aircraft', observationId: 'a1', properties: { altitude: 100, callsign: 'PUB1' } };
  const after = { entityType: 'aircraft', observationId: 'a2', properties: { altitude: 200, callsign: 'PUB1' } };
  assert.equal(engine.evaluate(after, { previous: before }).length, 1);
  const gone = { ...after, __alertAbsent: true };
  clock += 2000;
  const events = engine.evaluate(gone, { previous: after });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].sourceObservationIds, ['a2', 'a2']);
  assert.equal(events[0].before, 'PUB1');
});
