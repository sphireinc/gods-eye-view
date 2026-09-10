import { createPauseController, createProviderHealthStore, estimateProviderCost, PROVIDER_CATALOG, providerConfiguration } from './providerHealth.js';

function escapeText(documentRef, value) { const node = documentRef.createElement('span'); node.textContent = String(value ?? ''); return node; }

export async function initProviderHealthPanel({ documentRef = globalThis.document, fetchImpl = globalThis.fetch?.bind(globalThis), manager = null } = {}) {
  const chip = documentRef?.getElementById?.('provider-health-chip');
  const panel = documentRef?.getElementById?.('provider-health-panel');
  if (!chip || !panel || panel.dataset.initialized === 'true' || !fetchImpl) return null;
  panel.dataset.initialized = 'true';
  let payload;
  try { const response = await fetchImpl('/api/health/providers', { cache: 'no-store' }); if (!response.ok) throw new Error(String(response.status)); payload = await response.json(); } catch { chip.remove(); panel.remove(); return null; }
  const rows = panel.querySelector('[data-provider-health-rows]');
  const note = panel.querySelector('[data-provider-health-note]');
  const paused = createPauseController(PROVIDER_CATALOG.map((item) => item.id));
  const store = createProviderHealthStore();
  for (const item of payload.providers || []) store.update(item.id, item);
  const render = () => {
    rows.textContent = '';
    const configured = new Map((payload.configuration || []).map((item) => [item.id, item]));
    for (const item of store.snapshot()) {
      const config = configured.get(item.id) || {};
      const row = documentRef.createElement('div'); row.className = 'provider-health-row'; row.dataset.state = item.state || 'UNKNOWN';
      const title = documentRef.createElement('strong'); title.append(escapeText(documentRef, config.label || item.id));
      const state = documentRef.createElement('span'); state.className = 'provider-health-state'; state.textContent = paused.isPaused(item.id) ? 'PAUSED' : (item.state || (config.configured ? 'READY' : 'KEYLESS'));
      const meta = documentRef.createElement('small'); meta.textContent = `${config.configured ? 'configured' : 'keyless'} · ${item.attempts || 0} attempts${item.lastSuccess ? ` · last success ${new Date(item.lastSuccess).toLocaleString()}` : ''}`;
      const button = documentRef.createElement('button'); button.type = 'button'; button.textContent = paused.isPaused(item.id) ? 'RESUME' : 'PAUSE'; button.addEventListener('click', () => { paused.toggle(item.id); manager?.setProviderPaused?.(item.id, paused.isPaused(item.id)); render(); });
      row.append(title, state, meta, button); rows.append(row);
    }
    const diagnostics = store.diagnostics();
    note.textContent = `${diagnostics.providers.length} providers · approximate app estimate $${estimateProviderCost(diagnostics.providers).toFixed(4)} · pricing ${diagnostics.pricingVersion}`;
  };
  const copy = panel.querySelector('[data-provider-health-copy]');
  copy?.addEventListener('click', async () => { await globalThis.navigator?.clipboard?.writeText(JSON.stringify(store.diagnostics(), null, 2)); note.textContent = 'Sanitized diagnostics copied'; });
  chip.addEventListener('click', () => { panel.hidden = false; panel.classList.add('visible'); });
  panel.querySelector('[data-provider-health-close]')?.addEventListener('click', () => { panel.classList.remove('visible'); panel.hidden = true; });
  render();
  return { store, paused, refresh: render };
}
