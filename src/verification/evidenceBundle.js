const REPORT_TYPES = new Set(['wrong-location', 'no-longer-exists', 'new-feature', 'stale-feed', 'attribution-issue']);

export function createEvidenceBundle({ entity, reportType, note = '', observations = [], attachments = [] } = {}) {
  if (!entity?.id || !REPORT_TYPES.has(reportType)) throw new TypeError('entity and supported report type are required');
  return Object.freeze({ schemaVersion: 1, bundleId: `verification:${entity.id}:${Date.now()}`, entity: { id: String(entity.id), label: String(entity.label || entity.id), latitude: Number(entity.latitude), longitude: Number(entity.longitude), sourceUrl: entity.sourceUrl || null }, reportType, note: String(note), observations: observations.map((observation) => ({ observationId: observation.observationId || null, sourceId: observation.sourceId || null, observedAt: observation.observedAt || null, sourceUrl: observation.sourceUrl || null })), attachments: attachments.map((attachment) => ({ label: String(attachment.label || 'Attachment'), url: String(attachment.url), license: attachment.license || null })), createdAt: new Date().toISOString() });
}

export function renderOsmNoteDraft(bundle) {
  return [`[${bundle.reportType}] ${bundle.entity.label}`, '', bundle.note || 'Please review this map feature using the attached public evidence.', '', `Entity: ${bundle.entity.sourceUrl || bundle.entity.id}`, ...bundle.observations.map((item) => `Evidence: ${item.sourceId || 'unknown'} ${item.sourceUrl || ''} observed ${item.observedAt || 'unknown'}`), '', 'This is a reviewable draft. The app has not submitted or edited any third-party database.'].join('\n');
}
