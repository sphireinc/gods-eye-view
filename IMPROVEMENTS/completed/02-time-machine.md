# Time Machine and Deterministic World Replay

## Feature

Add a time controller that lets users move from live mode into a recorded time
window, scrub observations, pause, change playback speed, and return to live
without losing the current camera, style, or layer intent. The first release
should replay normalized ledger observations rather than attempting to archive
every provider payload or reproduce a provider's historical API.

## Why it is valuable

The project already has a strong present-tense experience and a cinematic
director. Time is the missing dimension: a user should be able to see an
airport change, compare a fire perimeter, follow a launch, or explain why a
contact appeared and disappeared. Replay also makes QA repeatable. A captured
ledger slice can reproduce a rendering issue without waiting for a live source
to enter the right state.

## Implementation

Build `src/time/timeController.js` around explicit modes: `LIVE`, `PAUSED_LIVE`,
`REPLAY`, and `RETURNING_TO_LIVE`. It owns a monotonic playhead, a selected
window, playback rate, and a replay session ID. Every consumer receives a
read-only clock and a stream cursor; it must not call `Date.now()` to decide
whether a replayed observation is current.

Add a replay adapter to `DataLayerManager`. In live mode layers keep their
existing lifecycle and polling. In replay mode, polling is suspended, network
requests are not silently made, and adapters consume records from the ledger.
Layers that cannot replay should remain enabled only if they declare a static
or unavailable replay policy. For example, a bundled boundary can remain
visible, while a live CCTV frame should say `NO FRAME AT PLAYHEAD` rather than
showing a current image under historical geometry.

The UI needs a bottom time rail with live/recorded status, a visible date and
UTC time, play/pause, speed, range selection, and a “return to live” action.
The camera should hold its pose while scrubbing unless the user chooses
“follow selected entity.” Entity trails need a clear distinction between
observed positions and interpolated segments. Interpolation may be offered for
visual continuity, but its styling and metadata must say `INTERPOLATED`.

Extend share links with a versioned time window and playhead, bounded to a
portable ledger export or a server-hosted recording ID. Never put arbitrary
history claims in a URL that another machine cannot access.

## Tests and failure behavior

Test clock monotonicity, reverse scrubbing, source timestamps that arrive out
of order, daylight-saving boundaries, missing intervals, layer opt-out, and
return-to-live while an update is in flight. A replay session must cancel old
cursor callbacks just as existing camera and radio flows cancel stale work.
When the ledger is empty, the controller should explain that no recording is
available; it must not show an empty globe as historical truth.

## Definition of done

A user can record or import a bounded session, scrub it offline, see truthful
observed/interpolated/unavailable states, and return to a fresh live session
without reloading the page. A replay can be run twice from the same export and
produce the same entity positions, layer statuses, camera events, and screenshot
timestamps.

## Implemented surfaces

- `src/time/timeController.js` provides the versioned clock, bounded playhead,
  playback rates, reverse seeking, deterministic cursors, honest
  `OBSERVED`/`INTERPOLATED`/`UNAVAILABLE` states, and bounded observation
  recording.
- `src/time/replaySession.js` consumes only `formatVersion: 1` archives,
  disables network-backed replay frames, emits deterministic UTC screenshot
  timestamps, and cancels all subscribers when a session closes.
- `src/data/manager.js` invalidates live refresh work on replay entry and
  publishes per-layer `STATIC`, `AVAILABLE`, or `UNAVAILABLE` replay status.
- `src/time/timeRail.js` exposes load, scrub, play/pause, speed, record, export,
  and return-to-live controls. The camera is not moved by replay controls.
- `src/time/timeShare.js` encodes only a versioned recording identifier and a
  bounded UTC window/playhead; it does not claim that an arbitrary URL contains
  historical data.
