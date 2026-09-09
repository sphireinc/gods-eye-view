const DEFAULT_KEYMAP = Object.freeze({
  ArrowUp: 'camera-north', ArrowDown: 'camera-south', ArrowLeft: 'camera-west', ArrowRight: 'camera-east',
  '+': 'zoom-in', '-': 'zoom-out', Tab: 'focus-next-layer', Enter: 'activate', Escape: 'close-surface',
});

export function createInputController({ keymap = DEFAULT_KEYMAP, announce = () => {} } = {}) {
  const commands = new Map();
  const bindings = new Map(Object.entries(keymap));
  return {
    register(command, handler) { if (typeof handler !== 'function') throw new TypeError('command handler must be a function'); commands.set(command, handler); return () => commands.delete(command); },
    commandForKey(key) { return bindings.get(key) || null; },
    dispatch(command, payload = {}) { const handler = commands.get(command); if (!handler) return { handled: false, command }; handler(payload); announce(command, payload); return { handled: true, command }; },
    handleKey(event) { const command = bindings.get(event.key); if (!command) return false; const result = this.dispatch(command, { event }); if (result.handled) event.preventDefault?.(); return result.handled; },
    conflicts() { const seen = new Map(); for (const [key, command] of bindings) { if (seen.has(key)) seen.get(key).push(command); else seen.set(key, [command]); } return [...seen.entries()].filter(([, commandsForKey]) => commandsForKey.length > 1); },
    keymap: Object.freeze(Object.fromEntries(bindings)),
  };
}

export function prefersReducedMotion(windowObject = globalThis.window) {
  return Boolean(windowObject?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
