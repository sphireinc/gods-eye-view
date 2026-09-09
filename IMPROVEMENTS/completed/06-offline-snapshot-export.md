# Offline Snapshot, Session Export, and Portable Briefings

## Feature

Add a “capture session” workflow that packages a bounded scene snapshot into a
portable archive for offline viewing, citation, and bug reports. The archive
should include normalized observations, camera/style/layer state, attribution,
health statuses, user annotations, and optional thumbnails—not provider secrets
or unlicensed raw media.

## Why it is valuable

The app is local-first, but a live scene is difficult to share reproducibly.
Share links describe state while most data remains ephemeral. A snapshot lets a
teacher send a lesson, a journalist preserve the context of a public event, a
contributor attach a failing scene to an issue, and a user reopen a favorite
view during an outage. It also creates a safer boundary than asking another
machine to hit the same third-party APIs.

## Implementation

Create `src/export/sessionArchive.js` with a versioned manifest and ZIP writer
(or a streamed JSON + asset directory for the first release). Include a
`scene.json`, `observations.ndjson`, `annotations.json`, `sources.json`, and
optional `thumbnails/`. Record camera destination/orientation, map stack,
visual style, scope settings, selected entity, detection settings, UTC capture
range, and exact app revision. Each observation retains provenance and license
metadata.

Add two modes: `DIAGNOSTIC` captures more state but redacts notes by default;
`PRESENTATION` captures only the visible and selected data. Let users choose a
time range and whether to include CCTV thumbnails, since those may have
provider-specific reuse constraints. Never capture `.env`, Pinokio environment
files, ephemeral OpenAI tokens, private URLs, or full server logs.

Implement an import route that validates archive size, manifest schema, source
licenses, entity count, and coordinate bounds before writing to IndexedDB. Load
archives in an isolated replay namespace. A broken or partially imported
archive must be discarded atomically. Show archive age and “offline snapshot”
in the HUD so an imported world cannot be mistaken for live state.

Add a one-click “copy issue bundle” action that creates a redacted diagnostic
archive and prints a manifest summary suitable for a GitHub issue. Provide
GeoJSON/CSV exports for selected entities and Markdown briefing export for the
correlation board.

## Testing and rollout

Test round-trip fidelity, schema migration, zip bombs and oversized input,
Unicode names, antimeridian coordinates, missing thumbnails, license refusal,
redaction, and offline startup. Add fixtures for each current layer's canonical
record. Verify imports do not activate network polling or restore a private
provider key.

## Definition of done

A user can capture a bounded scene, open it on a machine without network access,
see the same camera and observations with honest offline labels, and export
selected public records without leaking credentials or silently redistributing
provider-prohibited media.

## Implemented surfaces

- `src/offline/snapshot.js` defines a versioned offline-safe archive with
  capture modes, redaction, bounded entity/byte/coordinate validation,
  source/license metadata, capture range, app revision, limitations, and
  explicit network-disabled import state.
- Unlicensed thumbnails are refused; diagnostic exports redact notes and
  credential-shaped fields; imports verify the content digest before any store
  handoff.
- Selected public records can be exported as redacted GeoJSON or CSV, and an
  IndexedDB store validates the complete archive before atomically writing it.
- `src/offline/snapshotPanel.js` adds capture/open controls and marks imported
  content as offline in the UI without activating network polling.
