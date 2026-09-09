const REPORT_TYPES = new Set(['wrong-location', 'no-longer-exists', 'new-feature', 'stale-feed', 'attribution-issue']);

export function createEvidenceBundle({ entity, reportType, note = '', observations = [], attachments = [] } = {}) {
  if (!entity?.id || !REPORT_TYPES.has(reportType)) throw new TypeError('entity and supported report type are required');
  const latitude = Number(entity.latitude); const longitude = Number(entity.longitude); if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new TypeError('entity coordinates are invalid');
  const safeUrl = (value) => /^https:\/\//i.test(String(value || '')) ? String(value) : null;
  const safeAttachments = attachments.map((attachment) => ({ label: String(attachment.label || 'Attachment').slice(0, 120), url: safeUrl(attachment.url), license: attachment.license ? String(attachment.license).slice(0, 160) : null })).filter((attachment) => attachment.url);
  return Object.freeze({ schemaVersion: 1, bundleId: `verification:${entity.id}:${Date.now()}`, entity: { id: String(entity.id), label: String(entity.label || entity.id).slice(0, 200), latitude: Math.round(latitude * 10000) / 10000, longitude: Math.round(longitude * 10000) / 10000, sourceUrl: safeUrl(entity.sourceUrl) }, reportType, note: String(note).slice(0, 2000), observations: observations.map((observation) => ({ observationId: observation.observationId || null, sourceId: observation.sourceId || null, observedAt: observation.observedAt || null, sourceUrl: safeUrl(observation.sourceUrl) })), attachments: safeAttachments, createdAt: new Date().toISOString(), submission: 'DRAFT_ONLY' });
}

export function renderOsmNoteDraft(bundle) {
  return [`[${bundle.reportType}] ${bundle.entity.label}`, '', bundle.note || 'Please review this map feature using the attached public evidence.', '', `Entity: ${bundle.entity.sourceUrl || bundle.entity.id}`, ...bundle.observations.map((item) => `Evidence: ${item.sourceId || 'unknown'} ${item.sourceUrl || ''} observed ${item.observedAt || 'unknown'}`), '', 'This is a reviewable draft. The app has not submitted or edited any third-party database.'].join('\n');
}
