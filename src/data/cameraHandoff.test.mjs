import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraDistanceKm, createMosaicState, rankHandoffCandidates } from './cameraHandoff.js';
const base = { id: 'a', latitude: 0, longitude: 179, headingDeg: 90 };
test('uses antimeridian-safe distance and deterministic handoff ranking', () => { assert.ok(cameraDistanceKm(base, { latitude: 0, longitude: -179 }) < 250); const ranked = rankHandoffCandidates(base, [{ id: 'z', latitude: 0, longitude: -179, frameAt: 10 }, { id: 'b', latitude: 0, longitude: -178, frameAt: 20 }], { now: 100 }); assert.equal(ranked[0].camera.id, 'z'); });
test('keeps mosaic bounded and exposes independent tile states', () => { const mosaic = createMosaicState(Array.from({ length: 9 }, (_, i) => ({ id: `cam-${i}`, sourcePage: 'https://example.org', available: true })), { limit: 9 }); assert.equal(mosaic.tiles.length, 6); assert.equal(mosaic.update('cam-2', { state: 'FRAME_UNAVAILABLE' }), true); assert.equal(mosaic.visible(['cam-2'])[0].state, 'FRAME_UNAVAILABLE'); });
