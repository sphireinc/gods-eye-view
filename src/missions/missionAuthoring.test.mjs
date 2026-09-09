import assert from 'node:assert/strict';
import test from 'node:test';
import { createMissionLibrary, validateMission } from './missionAuthoring.js';

test('validates public-observatory missions and normalizes locations', () => {
  const mission = validateMission({ title: 'Morning Earthquake Watch', layers: ['earthquakes', 'earthquakes'], locations: [{ label: 'Region', latitude: 40, longitude: -73 }] });
  assert.deepEqual(mission.layers, ['earthquakes']);
  assert.equal(mission.purpose, 'public understanding');
});

test('rejects operational or tactical mission language', () => {
  assert.throws(() => validateMission({ title: 'Target aircraft', description: 'intercept route' }), /boundary/);
});

test('library replaces saved versions by stable id', () => {
  const library = createMissionLibrary();
  library.save({ id: 'm1', title: 'One' });
  library.save({ id: 'm1', title: 'Updated' });
  assert.equal(library.list().length, 1);
  assert.equal(library.get('m1').title, 'Updated');
});
