import assert from 'node:assert/strict';
import test from 'node:test';
import { briefingToMarkdown, buildPlaceBriefing, placeBriefingCacheKey } from './placeBriefing.js';

test('builds all stable briefing sections with source references', () => {
  const briefing = buildPlaceBriefing({ place: { name: 'Example City', latitude: 40, longitude: -73 }, sections: { now: [{ label: 'Weather', value: 'Cloudy', sourceIds: ['open-meteo'] }], evidence: [{ label: 'Age', value: '5m', state: 'STALE' }] } });
  assert.equal(Object.keys(briefing.sections).length, 7);
  assert.match(briefing.limitations.join(' '), /stale/i);
  assert.match(briefingToMarkdown(briefing), /Example City/);
  assert.match(briefingToMarkdown(briefing), /open-meteo/);
});

test('preserves only HTTPS source links and creates reproducible cache keys', () => {
  const briefing = buildPlaceBriefing({ sections: { evidence: [{ value: 'Measured', sourceUrls: ['http://bad', 'https://example.org/source'] }] } });
  assert.equal(briefing.sections.evidence[0].sourceUrls.length, 1);
  assert.match(briefingToMarkdown(briefing), /https:\/\/example.org\/source/);
  assert.equal(placeBriefingCacheKey({ place: { latitude: 1, longitude: 2 }, sourceVersions: { x: 1 } }), placeBriefingCacheKey({ place: { latitude: 1, longitude: 2 }, sourceVersions: { x: 1 } }));
});

test('empty places say no public observation was found rather than inventing context', () => {
  const briefing = buildPlaceBriefing({ place: { name: 'Quiet Place' } });
  assert.match(briefing.limitations[0], /No matching public observations/);
});
