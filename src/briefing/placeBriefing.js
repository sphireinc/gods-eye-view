const SECTION_IDS = Object.freeze(['where', 'now', 'recent-change', 'events', 'systems', 'evidence', 'limitations']);
function safeUrls(urls) { return urls.filter((url) => /^https:\/\//i.test(url)).slice(0, 12); }

function facts(items = []) {
  return Array.isArray(items) ? items.map((item) => ({ label: String(item.label || 'FACT'), value: String(item.value ?? 'UNKNOWN'), sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds.map(String).slice(0, 12) : [], sourceUrls: safeUrls(Array.isArray(item.sourceUrls) ? item.sourceUrls.map(String) : []), state: item.state || 'OBSERVED' })) : [];
}

export function placeBriefingCacheKey({ place = {}, window = null, sourceVersions = {}, ledgerGeneration = 0 } = {}) { return JSON.stringify({ place: [place.name || '', Number(place.latitude) || null, Number(place.longitude) || null, place.scale || 'unknown'], window, sourceVersions, ledgerGeneration }); }

export function buildPlaceBriefing({ place = {}, sections = {}, generatedAt = new Date().toISOString(), window = null } = {}) {
  const normalizedPlace = { name: String(place.name || 'Selected place'), latitude: place.latitude ?? null, longitude: place.longitude ?? null, timezone: place.timezone || null, scale: place.scale || 'unknown' };
  const result = {
    schemaVersion: 1, generatedAt, window, place: normalizedPlace,
    sections: Object.fromEntries(SECTION_IDS.map((id) => [id, facts(sections[id])])),
    limitations: [],
  };
  const allFacts = Object.values(result.sections).flat();
  if (!allFacts.length) result.limitations.push('No matching public observations were found in the selected sources.');
  if (allFacts.some((item) => item.state === 'STALE')) result.limitations.push('Some evidence is stale and may not describe current conditions.');
  if (allFacts.some((item) => item.state === 'UNKNOWN')) result.limitations.push('Some source states are unknown; absence of evidence is not evidence of absence.');
  return Object.freeze(result);
}

export function briefingToMarkdown(briefing) {
  const lines = [`# ${briefing.place.name}`, '', `Generated: ${briefing.generatedAt}`, `Window: ${briefing.window || 'not specified'}`, '', 'This dossier summarizes public observations; it does not establish that a place is safe, dangerous, normal, or clear.', ''];
  for (const [id, items] of Object.entries(briefing.sections)) {
    lines.push(`## ${id.replaceAll('-', ' ')}`);
    if (!items.length) lines.push('- No matching public observation was found.');
    for (const item of items) lines.push(`- **${item.label}:** ${item.value} (${item.state}; sources: ${item.sourceIds.join(', ') || 'none'})${item.sourceUrls.length ? ` ${item.sourceUrls.map((url) => `[source](${url})`).join(' ')}` : ''}`);
    lines.push('');
  }
  if (briefing.limitations.length) { lines.push('## limitations'); briefing.limitations.forEach((item) => lines.push(`- ${item}`)); }
  return lines.join('\n');
}
