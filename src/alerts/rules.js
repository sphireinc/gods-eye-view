const OPERATORS = Object.freeze({
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a ?? '').toLowerCase().includes(String(b).toLowerCase()),
});

function fieldValue(record, path) {
  return String(path).split('.').reduce((value, key) => value?.[key], record);
}

export function validateAlertRule(rule) {
  if (!rule || typeof rule !== 'object') throw new TypeError('alert rule is required');
  if (!String(rule.id || '').trim()) throw new TypeError('alert rule id is required');
  if (!String(rule.entityType || '').trim()) throw new TypeError('alert rule entityType is required');
  if (!OPERATORS[rule.operator]) throw new TypeError(`unsupported alert operator: ${rule.operator}`);
  return Object.freeze({
    id: String(rule.id),
    label: String(rule.label || rule.id),
    entityType: String(rule.entityType),
    field: String(rule.field || 'properties.value'),
    operator: rule.operator,
    value: rule.value,
    cooldownMs: Math.max(0, Number(rule.cooldownMs || 0)),
    enabled: rule.enabled !== false,
  });
}

export function createAlertEngine({ rules = [], now = () => Date.now() } = {}) {
  const registered = new Map();
  const lastTriggered = new Map();
  for (const rule of rules) {
    const validated = validateAlertRule(rule);
    registered.set(validated.id, validated);
  }
  return {
    add(rule) { const validated = validateAlertRule(rule); registered.set(validated.id, validated); return validated; },
    remove(id) { return registered.delete(id); },
    list() { return [...registered.values()]; },
    evaluate(record) {
      const matches = [];
      for (const rule of registered.values()) {
        if (!rule.enabled || record?.entityType !== rule.entityType) continue;
        if (!OPERATORS[rule.operator](fieldValue(record, rule.field), rule.value)) continue;
        const current = now();
        const previous = lastTriggered.get(rule.id) || -Infinity;
        if (current - previous < rule.cooldownMs) continue;
        lastTriggered.set(rule.id, current);
        matches.push(Object.freeze({ ruleId: rule.id, label: rule.label, observationId: record.observationId || null, triggeredAt: current, reason: `${rule.field} ${rule.operator} ${String(rule.value)}` }));
      }
      return matches;
    },
  };
}
