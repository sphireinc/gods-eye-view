import { createObservationRecorder, REPLAY_STATES, createTimeController, TIME_MODES } from './timeController.js';
import { createReplaySession } from './replaySession.js';
import { encodeTimeShareState } from './timeShare.js';

let session = null;
let recording = null;
let recordingListener = null;

function formatUtc(value) {
  return new Date(value).toISOString().replace('.000Z', 'Z');
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function frameSummary(records) {
  const counts = records.reduce((result, item) => {
    result[item.state] = (result[item.state] || 0) + 1;
    return result;
  }, {});
  return [
    counts[REPLAY_STATES.OBSERVED] ? `${counts[REPLAY_STATES.OBSERVED]} OBSERVED` : null,
    counts[REPLAY_STATES.INTERPOLATED] ? `${counts[REPLAY_STATES.INTERPOLATED]} INTERPOLATED` : null,
    counts[REPLAY_STATES.UNAVAILABLE] ? `${counts[REPLAY_STATES.UNAVAILABLE]} UNAVAILABLE` : null,
  ].filter(Boolean).join(' · ');
}

/** Install the keyboard-accessible offline replay and bounded capture rail. */
export function initTimeRail() {
  const rail = document.getElementById('time-rail');
  if (!rail) return null;
  const controller = createTimeController();
  const status = rail.querySelector('[data-time-status]');
  const range = rail.querySelector('[data-time-range]');
  const play = rail.querySelector('[data-time-play]');
  const rate = rail.querySelector('[data-time-rate]');
  const load = rail.querySelector('[data-time-load]');
  const record = rail.querySelector('[data-time-record]');
  const exportButton = rail.querySelector('[data-time-export]');
  const share = rail.querySelector('[data-time-share]');
  const file = rail.querySelector('[data-time-file]');
  const live = rail.querySelector('[data-time-live]');
  let activeArchive = null;
  let hasLoadedRecording = false;

  const update = (state) => {
    rail.dataset.mode = state.mode;
    const timestamp = state.windowStart == null ? '' : ` · ${formatUtc(state.playhead)}`;
    status.textContent = state.mode === TIME_MODES.LIVE
      ? `LIVE${hasLoadedRecording ? ' · RECORDING READY' : ' · NO RECORDING LOADED'}`
      : `${state.mode}${timestamp}`;
    play.disabled = !hasLoadedRecording;
    play.textContent = state.mode === TIME_MODES.REPLAY ? 'PAUSE' : 'PLAY';
    rate.disabled = !hasLoadedRecording;
    if (state.windowStart != null) {
      range.min = String(state.windowStart);
      range.max = String(state.windowEnd);
      range.value = String(state.playhead);
      range.disabled = false;
    } else range.disabled = true;
    exportButton.disabled = !recording?.size && !activeArchive?.records?.length;
    share.disabled = !activeArchive?.recordingId;
  };
  controller.subscribe(update);

  const stopSession = () => {
    session?.close();
    session = null;
    hasLoadedRecording = false;
    activeArchive = null;
  };

  const dispatchFrame = (frame) => {
    window.dispatchEvent(new CustomEvent('gev:replay-frame', { detail: frame }));
    const summary = frameSummary(frame.records);
    if (summary) status.textContent = `${status.textContent} · ${summary}`;
  };

  play.addEventListener('click', () => {
    if (controller.getState().mode === TIME_MODES.REPLAY) controller.pause();
    else controller.play();
  });
  rate.addEventListener('change', () => controller.setRate(Number(rate.value)));
  range.addEventListener('input', () => controller.seek(Number(range.value)));
  live.addEventListener('click', () => {
    stopSession();
    controller.returnToLive();
  });
  load.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    try {
      const archive = JSON.parse(await selected.text());
      stopSession();
      session = createReplaySession(archive, {
        controller,
        interpolate: true,
        onFrame: dispatchFrame,
      });
      activeArchive = archive;
      hasLoadedRecording = true;
      controller.enterReplay({ start: session.bounds.start, end: session.bounds.end });
    } catch (error) {
      status.textContent = `REPLAY UNAVAILABLE · ${error.message}`;
    } finally {
      file.value = '';
      update(controller.getState());
    }
  });

  record.addEventListener('click', () => {
    if (recording) {
      recordingListener?.();
      recordingListener = null;
      record.textContent = 'RECORD';
      record.removeAttribute('aria-pressed');
      status.textContent = `LIVE · CAPTURED ${recording.size} OBSERVATIONS`;
      update(controller.getState());
      return;
    }
    recording = createObservationRecorder();
    const listener = (event) => {
      const values = Array.isArray(event.detail) ? event.detail : event.detail?.records || [event.detail];
      recording.append(values);
      update(controller.getState());
    };
    window.addEventListener('gev:observation', listener);
    recordingListener = () => window.removeEventListener('gev:observation', listener);
    record.textContent = 'STOP RECORDING';
    record.setAttribute('aria-pressed', 'true');
    status.textContent = 'LIVE · RECORDING NORMALIZED OBSERVATIONS';
  });

  exportButton.addEventListener('click', () => {
    const archive = recording?.size ? recording.snapshot() : activeArchive;
    if (archive) downloadJson('gods-eye-view-observations.json', archive);
  });
  share.addEventListener('click', async () => {
    if (!activeArchive?.recordingId) return;
    const state = controller.getState();
    const query = encodeTimeShareState({
      recordingId: activeArchive.recordingId,
      start: state.windowStart,
      end: state.windowEnd,
      playhead: state.playhead,
    });
    const url = `${location.origin}${location.pathname}${query}`;
    await navigator.clipboard?.writeText(url);
    status.textContent = 'TIME SHARE LINK COPIED · RECORDING ID REQUIRED';
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
  window.__GEV_RECORD_OBSERVATION__ = (observation) => recording?.record(observation) || false;
  return controller;
}
