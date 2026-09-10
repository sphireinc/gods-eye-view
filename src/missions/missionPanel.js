import { createMissionLibrary, validateMission } from './missionAuthoring.js';
import { createMissionRunner } from './missionRunner.js';

/** Local mission authoring surface; imported JSON contains data only, never code. */
export function initMissionPanel({ manager = null, actions = {} } = {}) {
  const panel = document.getElementById('mission-authoring-panel');
  if (!panel) return null;
  const editor = panel.querySelector('[data-mission-editor]');
  const status = panel.querySelector('[data-mission-status]');
  const library = createMissionLibrary();
  const runner = createMissionRunner({ manager, actions });
  panel.querySelector('[data-mission-close]').addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('mission-authoring-launcher')?.addEventListener('click', () => { panel.hidden = false; });
  panel.querySelector('[data-mission-save]').addEventListener('click', () => {
    try { const mission = library.save(JSON.parse(editor.value)); status.textContent = `SAVED · ${mission.id} · ${mission.steps.length} STEPS`; }
    catch (error) { status.textContent = `MISSION REJECTED · ${error.message}`; }
  });
  panel.querySelector('[data-mission-run]').addEventListener('click', async () => {
    try { const state = await runner.run(JSON.parse(editor.value)); status.textContent = `${state.status} · ${state.reason || 'MISSION FINISHED'}`; }
    catch (error) { status.textContent = `MISSION REJECTED · ${error.message}`; }
  });
  panel.querySelector('[data-mission-export]').addEventListener('click', () => {
    try {
      const mission = validateMission(JSON.parse(editor.value));
      const url = URL.createObjectURL(new Blob([JSON.stringify(mission, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${mission.id}.json`; anchor.click(); URL.revokeObjectURL(url);
      status.textContent = 'MISSION EXPORTED · DATA ONLY';
    } catch (error) { status.textContent = `MISSION REJECTED · ${error.message}`; }
  });
  window.__GEV_MISSIONS__ = { library, runner, open: () => { panel.hidden = false; } };
  return window.__GEV_MISSIONS__;
}
