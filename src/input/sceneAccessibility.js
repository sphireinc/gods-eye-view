import { createInputController, prefersReducedMotion } from './inputController.js';

export function initSceneAccessibility({ documentRef = globalThis.document, windowRef = globalThis.window, manager = null } = {}) {
  const canvas = documentRef?.querySelector?.('#cesiumContainer canvas');
  const host = documentRef?.getElementById?.('accessible-scene-list');
  const live = documentRef?.getElementById?.('accessible-scene-announcement');
  if (!host || host.dataset.initialized === 'true') return null;
  host.dataset.initialized = 'true';
  if (canvas) { canvas.setAttribute('role', 'application'); canvas.setAttribute('aria-label', 'Interactive 3D world map. Use the scene controls to navigate.'); }
  const controller = createInputController({ announce: (command) => { if (live && command !== 'activate') live.textContent = `Command: ${command.replaceAll('-', ' ')}`; } });
  const render = (state = {}) => { host.textContent = ''; for (const [label, value] of Object.entries({ 'Camera locality': state.locality || 'Not selected', 'Selected entity': state.selected || 'None', 'Visible layers': state.layers || 'None', 'Data health': state.health || 'Unknown' })) { const row = documentRef.createElement('div'); row.className = 'accessible-scene-row'; const strong = documentRef.createElement('strong'); strong.textContent = label; const text = documentRef.createElement('span'); text.textContent = String(value); row.append(strong, text); host.append(row); } };
  controller.register('camera-north', () => manager?.nudgeCamera?.('north'));
  controller.register('camera-south', () => manager?.nudgeCamera?.('south'));
  controller.register('camera-east', () => manager?.nudgeCamera?.('east'));
  controller.register('camera-west', () => manager?.nudgeCamera?.('west'));
  controller.register('close-surface', () => documentRef.activeElement?.blur?.());
  documentRef.addEventListener('keydown', (event) => controller.handleKey(event));
  if (prefersReducedMotion(windowRef)) documentRef.documentElement.dataset.reducedMotion = 'true';
  render();
  return { controller, render };
}
