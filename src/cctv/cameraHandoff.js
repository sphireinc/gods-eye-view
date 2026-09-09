export function planCameraHandoff(cameras = [], { currentId = null, region = null, maxTiles = 4 } = {}) {
  const candidates = cameras.filter((camera) => camera && camera.id !== currentId && (!region || camera.region === region));
  return candidates.slice(0, Math.max(1, maxTiles)).map((camera, index) => ({
    slot: index, cameraId: camera.id, operator: camera.operator, sourcePage: camera.sourcePage,
    frameState: camera.frameState || 'FRAME_UNAVAILABLE',
    continuity: camera.frameState === 'FRESH' ? 'OBSERVED_FRAME' : 'NO_CONTINUITY_CLAIM',
  }));
}

export function mosaicStatus(slots = []) {
  const live = slots.filter((slot) => slot.frameState === 'FRESH').length;
  return { live, unavailable: slots.length - live, state: live ? 'PARTIAL_OR_LIVE' : 'NO_FRAME', caveat: 'Each tile is an independent public camera; adjacent tiles do not imply synchronized capture.' };
}
