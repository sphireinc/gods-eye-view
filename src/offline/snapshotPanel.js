import { exportOfflineSnapshot, importOfflineSnapshot } from './snapshot.js';

function download(snapshot) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gods-eye-view-offline-snapshot.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Install the bounded capture/import surface. Imported state is explicitly offline. */
export function initSnapshotPanel() {
  const panel = document.getElementById('snapshot-panel');
  if (!panel) return null;
  const status = panel.querySelector('[data-snapshot-status]');
  const records = new Map();
  const file = panel.querySelector('[data-snapshot-file]');
  const capture = panel.querySelector('[data-snapshot-capture]');
  const load = panel.querySelector('[data-snapshot-load]');
  const close = panel.querySelector('[data-snapshot-close]');
  const launcher = document.getElementById('snapshot-launcher');
  const listen = (event) => {
    const values = Array.isArray(event.detail) ? event.detail : event.detail?.records || [event.detail];
    for (const value of values) if (value?.observationId || value?.id) records.set(value.observationId || value.id, value);
  };
  window.addEventListener('gev:observation', listen);
  launcher?.addEventListener('click', () => { panel.hidden = false; });
  close?.addEventListener('click', () => { panel.hidden = true; });
  capture?.addEventListener('click', async () => {
    const snapshot = await exportOfflineSnapshot({ observations: [...records.values()], layers: [], sources: [] });
    download(snapshot);
    status.textContent = `OFFLINE SNAPSHOT EXPORTED · ${snapshot.manifest.observationCount} OBSERVATIONS`;
  });
  load?.addEventListener('click', () => file.click());
  file?.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    try {
      const snapshot = JSON.parse(await selected.text());
      const imported = await importOfflineSnapshot(snapshot);
      status.textContent = `OFFLINE SNAPSHOT VERIFIED · ${imported.observations.length} OBSERVATIONS · NETWORK DISABLED`;
      window.dispatchEvent(new CustomEvent('gev:offline-snapshot-loaded', { detail: imported }));
    } catch (error) {
      status.textContent = `SNAPSHOT REJECTED · ${error.message}`;
    } finally {
      file.value = '';
    }
  });
  window.__GEV_SNAPSHOT__ = { records, open: () => { panel.hidden = false; } };
  return window.__GEV_SNAPSHOT__;
}
