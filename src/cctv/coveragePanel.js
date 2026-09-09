import { coverageOverlap, queryCctvCoverage } from '../data/cctvCoverage.js';

/** Public-camera comparison panel; every footprint is labeled estimated. */
export function initCctvCoveragePanel() {
  const panel = document.getElementById('cctv-coverage-panel');
  if (!panel) return null;
  const list = panel.querySelector('[data-cctv-coverage-list]');
  const status = panel.querySelector('[data-cctv-coverage-status]');
  let cameras = [];
  let selected = [];
  const render = () => {
    list.replaceChildren(...queryCctvCoverage(cameras).map((camera) => {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${camera.name} · ${camera.provider} · ${camera.frameState} · ${camera.calibrationConfidence} · ESTIMATED`;
      button.addEventListener('click', () => {
        selected = [...selected.filter((id) => id !== camera.id), camera.id].slice(-2);
        const pair = selected.length === 2 ? coverageOverlap(cameras.find(({ id }) => id === selected[0]), camera) : null;
        status.textContent = pair ? `${selected.join(' + ')} · ${pair.overlap ? 'ESTIMATED OVERLAP' : 'NO ESTIMATED OVERLAP'} · ${pair.reason}` : `${selected.length}/2 cameras selected`;
      });
      row.append(button);
      return row;
    }));
    status.textContent = `${cameras.length} cameras · frames and poses are separate evidence`;
  };
  panel.querySelector('[data-cctv-coverage-close]').addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('cctv-coverage-launcher')?.addEventListener('click', () => { panel.hidden = false; render(); });
  window.addEventListener('gev:cctv-cameras', (event) => { cameras = event.detail?.cameras || event.detail || []; render(); });
  window.__GEV_CCTV_COVERAGE__ = { update(next) { cameras = Array.isArray(next) ? next : []; render(); }, open: () => { panel.hidden = false; render(); } };
  render();
  return window.__GEV_CCTV_COVERAGE__;
}
