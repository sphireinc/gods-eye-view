export function validateCameraPack(pack) {
  if (!pack || typeof pack !== 'object') throw new TypeError('camera pack is required');
  const id = String(pack.id || '').trim();
  if (!id || !String(pack.contributor || '').trim()) throw new TypeError('pack id and contributor are required');
  if (!String(pack.reviewContact || '').trim()) throw new TypeError('review contact is required');
  if (!Array.isArray(pack.cameras) || !pack.cameras.length) throw new TypeError('pack must contain cameras');
  const errors = [];
  for (const camera of pack.cameras) {
    if (!camera.id || !camera.operator || !camera.sourcePage || !camera.termsUrl) errors.push(`${camera.id || 'unknown'}: missing operator/source/terms`);
    if (!camera.lastReviewed) errors.push(`${camera.id || 'unknown'}: missing review date`);
  }
  if (errors.length) throw new Error(errors.join('; '));
  return Object.freeze({ id, version: String(pack.version || '1.0.0'), contributor: String(pack.contributor), reviewContact: String(pack.reviewContact), submittedAt: pack.submittedAt || new Date().toISOString(), status: 'PENDING_REVIEW', cameras: Object.freeze(pack.cameras.map((camera) => Object.freeze({ ...camera }))), takedownUrl: pack.takedownUrl ? String(pack.takedownUrl) : null });
}

export function reviewCameraPack(pack, { approved = false, reviewer = null, notes = '' } = {}) {
  const validated = validateCameraPack(pack);
  return Object.freeze({ ...validated, status: approved ? 'APPROVED' : 'CHANGES_REQUESTED', reviewer: reviewer ? String(reviewer) : null, reviewNotes: String(notes) });
}
