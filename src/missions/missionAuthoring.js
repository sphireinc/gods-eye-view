export const MISSION_VERSION = 1;
const BLOCKED_TERMS = /\b(target|strike|engage|intercept|attack|weapon|kill|route troops|optimize attack|fire control)\b/i;
const STEP_TYPES = new Set(['setLayers', 'flyTo', 'selectEntity', 'enterCockpit', 'setStyle', 'waitForHealth', 'narrate', 'captureMarker', 'end']);
const ASSERTION_TYPES = new Set(['layer-health', 'selection', 'step-complete']);

function coordinate(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || (field.includes('latitude') && (number < -90 || number > 90)) || (field.includes('longitude') && (number < -180 || number > 180))) throw new TypeError(`${field} must be a valid coordinate`);
  return number;
}

function validateStep(step, index) {
  if (!step || typeof step !== 'object' || !STEP_TYPES.has(step.type)) throw new TypeError(`unsupported mission step at ${index}`);
  const value = JSON.parse(JSON.stringify(step));
  if (typeof step.handler === 'function' || typeof step.script === 'string' || typeof step.fetch === 'string') throw new Error(`executable mission content is forbidden at ${index}`);
  if (step.type === 'setLayers' && (!Array.isArray(step.enabled) || step.enabled.some((id) => !/^[a-z0-9_.-]+$/i.test(String(id))))) throw new TypeError(`setLayers step ${index} is malformed`);
  if (step.type === 'flyTo') {
    value.latitude = coordinate(step.latitude, 'latitude');
    value.longitude = coordinate(step.longitude, 'longitude');
    value.heightM = Math.max(1, Number(step.heightM || 1));
  }
  if (step.type === 'waitForHealth') value.timeoutMs = Math.min(120_000, Math.max(100, Number(step.timeoutMs || 10_000)));
  return Object.freeze(value);
}

export function validateMission(mission) {
  if (!mission || typeof mission !== 'object') throw new TypeError('mission is required');
  const title = String(mission.title || '').trim();
  if (!title) throw new TypeError('mission title is required');
  if (BLOCKED_TERMS.test(`${title} ${mission.description || ''}`)) throw new Error('mission language is outside the public observatory boundary');
  const steps = (mission.steps || []).map(validateStep);
  if (!steps.length || steps.at(-1).type !== 'end') steps.push(Object.freeze({ type: 'end' }));
  const assertions = (mission.assertions || []).map((assertion, index) => {
    if (!ASSERTION_TYPES.has(assertion?.type)) throw new TypeError(`unsupported mission assertion at ${index}`);
    return Object.freeze({ ...assertion });
  });
  const locations = (mission.locations || []).map((location) => ({
    label: String(location.label || 'Unnamed place'), latitude: coordinate(location.latitude, 'latitude'), longitude: coordinate(location.longitude, 'longitude'),
  }));
  return Object.freeze({
    version: MISSION_VERSION, id: String(mission.id || `mission:${Date.now()}`), title,
    description: String(mission.description || ''), purpose: String(mission.purpose || 'public understanding'),
    layers: Object.freeze([...new Set((mission.layers || []).map(String))]), locations: Object.freeze(locations),
    requirements: Object.freeze([...(mission.requirements || [])].map(String)), steps: Object.freeze(steps),
    assertions: Object.freeze(assertions), cleanup: mission.cleanup === 'keep-final' ? 'keep-final' : 'restore',
    createdAt: mission.createdAt || new Date().toISOString(),
  });
}

export function createMissionLibrary(seed = []) {
  const missions = new Map();
  return {
    save(mission) { const validated = validateMission(mission); missions.set(validated.id, validated); return validated; },
    get(id) { return missions.get(id) || null; },
    list() { return [...missions.values()]; },
    remove(id) { return missions.delete(id); },
    importAll(values = seed) { for (const mission of values) this.save(mission); return this.list(); },
  };
}
