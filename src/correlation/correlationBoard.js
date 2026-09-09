import {
  addEvidence,
  correlateWorkspace,
  createCorrelationWorkspace,
  createWorkspaceRepository,
  exportWorkspaceJson,
  exportWorkspaceMarkdown,
} from './eventCorrelation.js';

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Install a read-only public correlation board fed by normalized observations. */
export function initCorrelationBoard() {
  const panel = document.getElementById('correlation-board');
  if (!panel) return null;
  const evidenceList = panel.querySelector('[data-correlation-evidence]');
  const eventList = panel.querySelector('[data-correlation-events]');
  const status = panel.querySelector('[data-correlation-status]');
  const title = panel.querySelector('[data-correlation-title]');
  const notes = panel.querySelector('[data-correlation-notes]');
  const records = new Map();
  let workspace = createCorrelationWorkspace();
  let repository = null;
  try { repository = createWorkspaceRepository(); } catch { /* local persistence is optional */ }

  const render = () => {
    evidenceList.replaceChildren(...workspace.evidence.map((item) => {
      const row = document.createElement('li');
      row.textContent = `${item.observationId} · ${item.sourceId} · ${item.observedAt} · ${item.uncertainty}`;
      return row;
    }));
    const correlations = workspace.correlations || [];
    eventList.replaceChildren(...correlations.map((event) => {
      const row = document.createElement('li');
      row.textContent = `${event.eventId} · ${event.observationCount} observations · ${event.explanations.flatMap((item) => item.explanations).join('; ') || event.caveat}`;
      return row;
    }));
    status.textContent = `${workspace.evidence.length} evidence · ${correlations.length} correlations · ${workspace.evidence.length ? 'co-occurrence only' : 'waiting for public observations'}`;
  };

  const addVisibleRecords = () => {
    workspace = correlateWorkspace(addEvidence(workspace, [...records.values()]));
    render();
  };
  document.getElementById('correlation-launcher')?.addEventListener('click', () => {
    panel.hidden = false;
  });
  panel.querySelector('[data-correlation-group]').addEventListener('click', addVisibleRecords);
  panel.querySelector('[data-correlation-close]').addEventListener('click', () => {
    panel.hidden = true;
  });
  panel.querySelector('[data-correlation-json]').addEventListener('click', () => {
    download('gev-correlation-workspace.json', exportWorkspaceJson(workspace), 'application/json');
  });
  panel.querySelector('[data-correlation-markdown]').addEventListener('click', () => {
    download('gev-correlation-workspace.md', exportWorkspaceMarkdown(workspace), 'text/markdown');
  });
  panel.querySelector('[data-correlation-save]').addEventListener('click', async () => {
    if (!repository) {
      status.textContent = 'LOCAL PERSISTENCE UNAVAILABLE';
      return;
    }
    workspace = { ...workspace, title: title.value, notes: notes.value, updatedAt: new Date().toISOString() };
    await repository.save(workspace);
    status.textContent = `SAVED LOCALLY · ${workspace.id}`;
  });
  window.addEventListener('gev:observation', (event) => {
    const values = Array.isArray(event.detail) ? event.detail : event.detail?.records || [event.detail];
    for (const record of values) {
      if (record?.observationId || record?.id) records.set(record.observationId || record.id, record);
    }
  });
  window.addEventListener('gev:correlation-open', () => { panel.hidden = false; });
  window.__GEV_CORRELATION__ = {
    addRecords(values) { for (const value of values || []) records.set(value.observationId || value.id, value); addVisibleRecords(); },
    getWorkspace: () => workspace,
    open: () => { panel.hidden = false; },
  };
  render();
  return window.__GEV_CORRELATION__;
}
