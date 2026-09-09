const BLOCKED_TERMS = /\b(target|strike|engage|intercept|attack|weapon|kill|route troops|optimize attack|fire control)\b/i;

export function validateMission(mission) {
  if (!mission || typeof mission !== 'object') throw new TypeError('mission is required');
  const title = String(mission.title || '').trim();
  if (!title) throw new TypeError('mission title is required');
  const description = String(mission.description || '').trim();
  if (BLOCKED_TERMS.test(`${title} ${description}`)) throw new Error('mission language is outside the public observatory boundary');
  const layers = Array.isArray(mission.layers) ? [...new Set(mission.layers.map(String))] : [];
  const locations = Array.isArray(mission.locations) ? mission.locations.map((location) => ({
    label: String(location.label || 'Unnamed place'), latitude: Number(location.latitude), longitude: Number(location.longitude),
  })) : [];
  if (locations.some((location) => !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude))) throw new TypeError('mission locations must have coordinates');
  return Object.freeze({
    id: String(mission.id || `mission:${Date.now()}`), title, description,
    purpose: String(mission.purpose || 'public understanding'), layers, locations,
    createdAt: mission.createdAt || new Date().toISOString(), version: 1,
  });
}

export function createMissionLibrary(seed = []) {
  const missions = new Map();
  return {
    save(mission) { const validated = validateMission(mission); missions.set(validated.id, validated); return validated; },
    get(id) { return missions.get(id) || null; },
    list() { return [...missions.values()]; },
    remove(id) { return missions.delete(id); },
  };
}
