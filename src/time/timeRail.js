import { createReplaySession } from './replaySession.js';
import { createTimeController, TIME_MODES } from './timeController.js';

let session = null;

function formatUtc(value) {
  return new Date(value).toISOString().replace('.000Z', 'Z');
}

/** Install the small, keyboard-accessible offline replay rail. */
export function initTimeRail() {
  const rail = document.getElementById('time-rail');
  if (!rail) return null;
  const controller = createTimeController();
  const status = rail.querySelector('[data-time-status]');
  const range = rail.querySelector('[data-time-range]');
  const play = rail.querySelector('[data-time-play]');
  const load = rail.querySelector('[data-time-load]');
  const file = rail.querySelector('[data-time-file]');
  const live = rail.querySelector('[data-time-live]');
  const update = (state) => {
    rail.dataset.mode = state.mode;
    status.textContent = state.mode === TIME_MODES.LIVE
      ? 'LIVE · NO RECORDING LOADED'
      : `${state.mode} · ${formatUtc(state.playhead)}`;
    play.disabled = state.mode === TIME_MODES.LIVE;
    play.textContent = state.mode === TIME_MODES.REPLAY ? 'PAUSE' : 'PLAY';
    if (state.windowStart != null) {
      range.min = String(state.windowStart);
      range.max = String(state.windowEnd);
      range.value = String(state.playhead);
      range.disabled = false;
    } else range.disabled = true;
  };
  controller.subscribe(update);
  play.addEventListener('click', () => {
    if (controller.getState().mode === TIME_MODES.REPLAY) controller.pause();
    else controller.play();
  });
  range.addEventListener('input', () => controller.seek(Number(range.value)));
  live.addEventListener('click', () => {
    session?.close();
    session = null;
    controller.returnToLive();
  });
  load.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    try {
      session?.close();
      session = createReplaySession(JSON.parse(await selected.text()), {
        controller,
        onFrame: (frame) => window.dispatchEvent(new CustomEvent('gev:replay-frame', { detail: frame })),
      });
      controller.enterReplay({ start: session.bounds.start, end: session.bounds.end });
    } catch (error) {
      status.textContent = `REPLAY UNAVAILABLE · ${error.message}`;
    } finally {
      file.value = '';
    }
  });
  let previous = null;
  const frame = (timestamp) => {
    if (previous != null) controller.tick(Math.max(0, timestamp - previous));
    previous = timestamp;
    if (controller.getState().mode === TIME_MODES.REPLAY) requestAnimationFrame(frame);
    else previous = null;
  };
  controller.subscribe((state) => {
    if (state.mode === TIME_MODES.REPLAY && previous == null) requestAnimationFrame(frame);
  });
  window.__GEV_TIME_CONTROLLER__ = controller;
  return controller;
}
