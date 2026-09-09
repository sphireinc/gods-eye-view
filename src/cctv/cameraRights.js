const PRIVACY_CLASSES = new Set(['scenic', 'traffic', 'weather', 'wildlife', 'transit', 'mixed-public-space']);

export function evaluateCameraRights(camera, { action = 'display', now = Date.now() } = {}) {
  const reasons = [];
  if (!camera?.operator) reasons.push('operator missing');
  if (!camera?.sourcePage) reasons.push('public source page missing');
  if (!camera?.termsUrl) reasons.push('terms URL missing');
  if (!PRIVACY_CLASSES.has(String(camera?.privacyClass || '').toLowerCase())) reasons.push('privacy classification missing');
  const permissions = camera.permissions || {};
  if (action === 'proxy' && permissions.proxy !== true) reasons.push('proxy permission not granted');
  if (action === 'cache' && permissions.cache !== true) reasons.push('cache permission not granted');
  if (action === 'projection' && permissions.projection !== true) reasons.push('projection permission not granted');
  if (camera.lastReviewed && Number.isFinite(Date.parse(camera.lastReviewed)) && now - Date.parse(camera.lastReviewed) > 365 * 24 * 60 * 60 * 1000) reasons.push('catalog review expired');
  return { allowed: reasons.length === 0, action, reasons, label: reasons.length ? 'RIGHTS_REVIEW_REQUIRED' : 'REVIEWED_PUBLIC_FEED' };
}

export function filterCamerasByRights(cameras, options = {}) {
  return cameras.filter((camera) => evaluateCameraRights(camera, options).allowed);
}
