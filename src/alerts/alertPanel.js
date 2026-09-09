import { createAlertEngine, validateAlertRule } from './rules.js';

/** Minimal in-app alert drawer; all rule evaluation stays local and evidence-linked. */
export function initAlertPanel() {
  const panel = document.getElementById('alerts-panel');
  if (!panel) return null;
  const list = panel.querySelector('[data-alert-history]');
  const status = panel.querySelector('[data-alert-status]');
  const engine = createAlertEngine();
  const render = () => {
    list.replaceChildren(...engine.getHistory().slice(-20).reverse().map((event) => {
      const row = document.createElement('li');
      row.textContent = `${event.name} · ${event.state} · ${event.observationId || 'source unavailable'} · ${event.reason}`;
      return row;
    }));
    status.textContent = `${engine.list().length} rules · ${engine.getHistory().length} events · UNKNOWN means source unavailable`;
  };
  panel.querySelector('[data-alert-close]').addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('alerts-launcher')?.addEventListener('click', () => { panel.hidden = false; });
  window.addEventListener('gev:alert', render);
  window.__GEV_ALERTS__ = {
    addRule(rule) { const result = engine.add(validateAlertRule(rule)); render(); return result; },
    evaluate: (record, options) => { const events = engine.evaluate(record, options); render(); return events; },
    getHistory: () => engine.getHistory(),
  };
  render();
  return window.__GEV_ALERTS__;
}
