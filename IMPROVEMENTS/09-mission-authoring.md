# Mission Authoring and Reproducible Scene Director

## Feature

Expand the current scene director into a mission authoring system: a sequence
of named steps that can enable layers, fly to locations, select public entities,
change visual styles, pause for narration, and capture a deterministic replay or
presentation.

## Why it is valuable

The first-run launcher already frames the app as missions, and the project has
camera tours, share links, voice actions, safe frames, and recording QA. A
structured mission format would connect those systems into reusable lessons,
demos, regression cases, and community-authored stories without hard-coding a
new script for every sequence.

## Implementation

Define a versioned mission JSON schema with metadata, requirements, initial
state, steps, assertions, and cleanup policy. Steps include `setLayers`,
`flyTo`, `selectEntity`, `enterCockpit`, `setStyle`, `waitForHealth`, `narrate`,
`captureMarker`, and `end`. Assertions should check observable facts such as
layer health or selection identity, not pixel-perfect provider content.

Implement `src/scenes/missionRunner.js` as a cancellable state machine with an
operation epoch. It must use existing manager/context transactions, camera
verbs, and voice action functions rather than duplicating them. A failed step
pauses with a clear reason; it must not advance as though a network-backed
layer loaded. Cleanup restores the exact pre-mission layer and camera snapshot
unless the user chooses “keep final scene.”

Add an authoring drawer with a step list, record-current-view button, timing
controls, requirement editor, preview, save/export, and accessibility-friendly
text alternatives. Imported missions run in a sandboxed capability set: no
arbitrary JavaScript, no arbitrary fetch URL, no secret access, and no automatic
external webhook. Voice can start named local missions but cannot invent
unreviewed tool actions from mission text.

Support deterministic synthetic data and ledger snapshots as mission fixtures.
That makes a mission useful even when OpenSky, CCTV, or Overpass is down.

## Testing and rollout

Test cancellation at every await boundary, rollback after partial layer enable,
camera supersession, missing requirements, replay fixture determinism, and
import validation. Add a small built-in “show the globe / select a contact /
return home” mission and migrate one existing QA flow to prove the format.

## Definition of done

A user can author, save, share, and replay a mission with explicit requirements,
truthful pauses, reversible cleanup, and no executable content. The same mission
can serve as a demo, a lesson, or a regression fixture.
