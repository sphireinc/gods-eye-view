import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWorldPulse, pulseToMarkdown } from './worldPulse.js';

test('builds multi-source pulse cards without opaque severity scores', () => {
  const pulse = buildWorldPulse({ regions: [{ regionId: 'a', label: 'Region A' }, { regionId: 'b', label: 'Region B' }], signals: [{ regionId: 'a', label: 'Earthquake activity', sourceIds: ['usgs'], explanation: 'Recent public observations' }, { regionId: 'a', label: 'Humanitarian report', sourceIds: ['reliefweb'], explanation: 'Report published' }] });
  assert.equal(pulse.cards[0].state, 'CHANGING');
  assert.equal(pulse.cards[1].state, 'NO_MATCHING_PUBLIC_SIGNAL');
  assert.match(pulseToMarkdown(pulse), /under-observed/i);
});
