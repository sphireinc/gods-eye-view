const EARTH_RADIUS_KM = 6371;
function radians(value) { return value * Math.PI / 180; }
export function cameraDistanceKm(a, b) { const p1 = radians(a.latitude); const p2 = radians(b.latitude); const dp = radians(b.latitude - a.latitude); const dl = radians(b.longitude - a.longitude); const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
function headingDelta(a, b) { if (!Number.isFinite(a) || !Number.isFinite(b)) return 180; return Math.abs(((a - b + 540) % 360) - 180); }
export function rankHandoffCandidates(selected, candidates = [], { direction = null, now = Date.now(), max = 6 } = {}) {
  const ranked = candidates.filter((camera) => camera?.id && camera.id !== selected?.id && camera.available !== false).map((camera) => {
    const distanceKm = cameraDistanceKm(selected, camera);
    return { camera, distanceKm, score: [direction == null ? 1 : headingDelta(direction, camera.headingDeg), distanceKm, now - (Number(camera.frameAt) || 0), camera.projection === 'calibrated' ? 0 : 1, camera.id] };
  });
  return ranked.sort((a, b) => a.score[0] - b.score[0] || a.score[1] - b.score[1] || a.score[2] - b.score[2] || a.score[3] - b.score[3] || a.score[4].localeCompare(b.score[4])).slice(0, max);
}
export function createMosaicState(cameras = [], { limit = 4 } = {}) { const tiles = cameras.slice(0, Math.max(1, Math.min(6, limit))).map((camera) => ({ id: camera.id, source: camera.sourcePage, state: camera.available === false ? 'UNAVAILABLE' : 'IDLE', frameAt: camera.frameAt || null })); return { limit: tiles.length, tiles, update(id, next) { const tile = tiles.find((item) => item.id === id); if (!tile) return false; Object.assign(tile, next); return true; }, visible(ids) { const shown = new Set(ids); return tiles.filter((tile) => shown.has(tile.id)); } }; }
